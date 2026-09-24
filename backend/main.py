import os
import asyncio
from typing import Optional, List
from fastapi import FastAPI, WebSocket, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from telethon import TelegramClient, events
from telethon.tl.types import MessageService
from telethon.errors import FloodWaitError
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, desc
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, timedelta
from pydantic import BaseModel
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
API_ID = int(os.getenv("API_ID"))
API_HASH = os.getenv("API_HASH")
DB_PATH = "telegram_crm.db"
SESSION_NAME = "telegram_session"

# Database
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# ORM Models
class Contact(Base):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(Integer, unique=True)
    name = Column(String)
    username = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    is_bot = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    telegram_msg_id = Column(Integer)
    sender_id = Column(Integer)
    sender_name = Column(String)
    chat_id = Column(Integer)
    text = Column(Text)
    is_outgoing = Column(Boolean)
    timestamp = Column(DateTime)

class Chat(Base):
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(Integer, unique=True, index=True)
    name = Column(String)
    is_group = Column(Boolean)
    last_message_at = Column(DateTime)
    last_message_text = Column(String, nullable=True)
    unread_count = Column(Integer, default=0)

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True)
    contact_id = Column(Integer)
    telegram_id = Column(Integer)
    name = Column(String)
    status = Column(String, default="novo")  # references KanbanColumn.key
    tags = Column(String, default="")  # comma-separated
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class KanbanColumn(Base):
    __tablename__ = "kanban_columns"
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True)  # stable id used by Lead.status, never changes after creation
    label = Column(String)
    color = Column(String, default="#2a78d6")
    position = Column(Integer, default=0)

Base.metadata.create_all(engine)

DEFAULT_KANBAN_COLUMNS = [
    ("novo", "Novo", "#898781"),
    ("qualificado", "Qualificado", "#2a78d6"),
    ("negociando", "Negociando", "#fab219"),
    ("ganho", "Ganho", "#0ca30c"),
    ("perdido", "Perdido", "#d03b3b"),
]

def seed_kanban_columns():
    db = SessionLocal()
    try:
        if db.query(KanbanColumn).count() == 0:
            for idx, (key, label, color) in enumerate(DEFAULT_KANBAN_COLUMNS):
                db.add(KanbanColumn(key=key, label=label, color=color, position=idx))
            db.commit()
    finally:
        db.close()

def slugify_column_key(label: str, db) -> str:
    import re
    base = re.sub(r'[^a-z0-9]+', '-', label.lower()).strip('-') or 'coluna'
    key = base
    n = 1
    while db.query(KanbanColumn).filter_by(key=key).first():
        n += 1
        key = f"{base}-{n}"
    return key

# Pydantic Schemas
class ContactSchema(BaseModel):
    telegram_id: int
    name: str
    username: Optional[str] = None
    phone: Optional[str] = None
    is_bot: bool = False

    class Config:
        from_attributes = True

class MessageSchema(BaseModel):
    telegram_msg_id: int
    sender_id: int
    sender_name: str
    chat_id: int
    text: str
    is_outgoing: bool
    timestamp: datetime

    class Config:
        from_attributes = True

class ChatSchema(BaseModel):
    telegram_id: int
    name: str
    is_group: bool
    last_message_at: datetime
    unread_count: int = 0

    class Config:
        from_attributes = True

class LeadSchema(BaseModel):
    telegram_id: int
    name: str
    status: str = "novo"
    tags: str = ""
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class SendMessageRequest(BaseModel):
    chat_id: int
    text: str

class LoginRequest(BaseModel):
    phone: str

class VerifyRequest(BaseModel):
    phone: str
    code: str

class KanbanColumnCreate(BaseModel):
    label: str
    color: str = "#2a78d6"

class KanbanColumnUpdate(BaseModel):
    label: Optional[str] = None
    color: Optional[str] = None

def safe_name(entity) -> str:
    """Always returns a non-empty display name, even for accounts/chats
    Telegram gives no title/first_name for (e.g. deleted accounts)."""
    if entity is None:
        return "Desconhecido"
    return (
        getattr(entity, 'title', None)
        or getattr(entity, 'first_name', None)
        or getattr(entity, 'username', None)
        or "Desconhecido"
    )

# Global state
client: Optional[TelegramClient] = None
connected_clients: set = set()
is_authenticated = False
import_in_progress = False

async def on_new_message(event):
    """Handle incoming messages in real-time"""
    if isinstance(event.message, MessageService):
        return

    db = SessionLocal()
    try:
        sender = await event.get_sender()
        chat = await event.get_chat()

        if not sender or not chat:
            return

        # Save message
        msg = Message(
            telegram_msg_id=event.id,
            sender_id=sender.id,
            sender_name=safe_name(sender),
            chat_id=chat.id,
            text=event.text or "[Media]",
            is_outgoing=event.out,
            timestamp=event.date
        )
        db.add(msg)

        # Update chat
        is_group = hasattr(chat, 'megagroup') or hasattr(chat, 'gigagroup')
        preview_text = event.text or "[Mídia]"
        chat_obj = db.query(Chat).filter_by(telegram_id=chat.id).first()
        if chat_obj:
            chat_obj.last_message_at = event.date
            chat_obj.last_message_text = preview_text
            if not event.out:
                chat_obj.unread_count += 1
        else:
            new_chat = Chat(
                telegram_id=chat.id,
                name=getattr(chat, 'title', None) or safe_name(sender),
                is_group=is_group,
                last_message_at=event.date,
                last_message_text=preview_text
            )
            db.add(new_chat)

        # Auto-create contact + lead for brand new private chats
        is_new_lead = False
        if not is_group and not sender.bot:
            existing_lead = db.query(Lead).filter_by(telegram_id=sender.id).first()
            if not existing_lead:
                existing_contact = db.query(Contact).filter_by(telegram_id=sender.id).first()
                if not existing_contact:
                    db.add(Contact(
                        telegram_id=sender.id,
                        name=safe_name(sender),
                        username=getattr(sender, 'username', None),
                        is_bot=sender.bot
                    ))
                db.add(Lead(
                    contact_id=sender.id,
                    telegram_id=sender.id,
                    name=safe_name(sender),
                    status="novo"
                ))
                is_new_lead = True

        db.commit()

        # Notify connected WebSocket clients
        for ws in list(connected_clients):
            try:
                await ws.send_json({
                    "type": "new_message",
                    "data": {
                        "sender_id": sender.id,
                        "sender_name": safe_name(sender),
                        "chat_id": chat.id,
                        "text": event.text or "[Media]",
                        "timestamp": event.date.isoformat(),
                        "is_outgoing": event.out,
                        "is_new_lead": is_new_lead
                    }
                })
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                connected_clients.discard(ws)
    except Exception as e:
        logger.error(f"Error handling new message: {e}")
    finally:
        db.close()

async def import_history():
    """Import all historical messages from Telegram"""
    global import_in_progress
    import_in_progress = True
    db = SessionLocal()
    try:
        logger.info("Starting historical import...")
        try:
            dialogs = await client.get_dialogs()
        except FloodWaitError as e:
            logger.warning(
                f"⏳ Telegram pediu para esperar {e.seconds}s antes de listar "
                f"as conversas. Aguardando e tentando de novo..."
            )
            await asyncio.sleep(e.seconds + 1)
            dialogs = await client.get_dialogs()
        total_dialogs = len(dialogs)
        logger.info(f"✓ {total_dialogs} conversas encontradas no Telegram, importando...")

        for idx, dialog in enumerate(dialogs):
            if idx > 0 and idx % 10 == 0:
                logger.info(f"... progresso: {idx}/{total_dialogs} conversas processadas")
            try:
                chat = dialog.entity

                # Save chat (update in place if it already exists, by telegram_id)
                chat_name = safe_name(chat)
                is_group = hasattr(chat, 'megagroup') or hasattr(chat, 'gigagroup')

                # dialog.date/message are the timestamp and content of that
                # chat's most recent message - use them instead of "now" so
                # the chat list can be sorted by actual recency, not import
                # order, and show a real preview like Telegram itself does.
                last_msg_at = dialog.date or datetime.now()
                last_msg_text = None
                if dialog.message is not None:
                    last_msg_text = dialog.message.text or "[Mídia]"

                chat_obj = db.query(Chat).filter_by(telegram_id=chat.id).first()
                if chat_obj:
                    chat_obj.name = chat_name
                    chat_obj.is_group = is_group
                    chat_obj.unread_count = dialog.unread_count or 0
                    chat_obj.last_message_at = last_msg_at
                    chat_obj.last_message_text = last_msg_text
                else:
                    db.add(Chat(
                        telegram_id=chat.id,
                        name=chat_name,
                        is_group=is_group,
                        last_message_at=last_msg_at,
                        last_message_text=last_msg_text,
                        unread_count=dialog.unread_count or 0
                    ))

                # Save contact if private chat
                if not is_group and hasattr(chat, 'first_name'):
                    contact_obj = db.query(Contact).filter_by(telegram_id=chat.id).first()
                    if contact_obj:
                        contact_obj.name = safe_name(chat)
                        contact_obj.username = getattr(chat, 'username', None)
                        contact_obj.is_bot = getattr(chat, 'bot', False)
                    else:
                        db.add(Contact(
                            telegram_id=chat.id,
                            name=safe_name(chat),
                            username=getattr(chat, 'username', None),
                            is_bot=getattr(chat, 'bot', False)
                        ))

                    # Create lead only if one doesn't already exist (avoid
                    # resetting a lead's status/tags/notes on every re-import)
                    lead_obj = db.query(Lead).filter_by(telegram_id=chat.id).first()
                    if not lead_obj:
                        db.add(Lead(
                            contact_id=chat.id,
                            telegram_id=chat.id,
                            name=safe_name(chat),
                            status="novo"
                        ))

                # Get message history (limit to 100 per chat to avoid rate limiting)
                msg_count = 0
                async for msg in client.iter_messages(chat, limit=100):
                    try:
                        sender = await msg.get_sender()
                        if not sender:
                            continue

                        existing_msg = db.query(Message).filter_by(
                            chat_id=chat.id, telegram_msg_id=msg.id
                        ).first()
                        if not existing_msg:
                            db.add(Message(
                                telegram_msg_id=msg.id,
                                sender_id=sender.id,
                                sender_name=safe_name(sender),
                                chat_id=chat.id,
                                text=msg.text or "[Media]",
                                is_outgoing=msg.out,
                                timestamp=msg.date
                            ))
                        msg_count += 1
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
                        continue

                db.commit()
                logger.info(f"✓ Chat '{chat_name}' - {msg_count} messages imported")

                # Small pause between chats so we don't hammer Telegram's
                # API and trigger a long FloodWaitError.
                await asyncio.sleep(0.3)

            except FloodWaitError as e:
                logger.warning(
                    f"⏳ Telegram pediu para esperar {e.seconds}s (limite de "
                    f"requisições). Aguardando antes de continuar a importação..."
                )
                db.rollback()
                await asyncio.sleep(e.seconds + 1)
                continue

            except Exception as e:
                logger.error(f"Error processing chat: {e}")
                db.rollback()
                continue

        logger.info("✓ Historical import completed!")
    except Exception as e:
        logger.error(f"Error importing history: {e}")
    finally:
        import_in_progress = False
        db.close()

def fix_missing_names():
    """One-time cleanup: earlier versions could save chats/contacts/leads
    with name=NULL (e.g. Telegram deleted accounts). Backfill those rows
    so the frontend never has to render a null name."""
    db = SessionLocal()
    try:
        fixed = 0
        for model in (Chat, Contact, Lead):
            rows = db.query(model).filter(
                (model.name == None) | (model.name == "")
            ).all()
            for row in rows:
                row.name = "Desconhecido"
                fixed += 1
        if fixed:
            db.commit()
            logger.info(f"✓ Corrigidos {fixed} registros com nome ausente")
    finally:
        db.close()

def migrate_add_missing_columns():
    """SQLite doesn't support adding columns via metadata.create_all() on an
    existing table, so newly added columns need an explicit ALTER TABLE for
    databases created by an earlier version of the app."""
    with engine.connect() as conn:
        existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(chats)").fetchall()}
        if "last_message_text" not in existing:
            conn.exec_driver_sql("ALTER TABLE chats ADD COLUMN last_message_text VARCHAR")
            conn.commit()
            logger.info("✓ Coluna last_message_text adicionada em chats")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    migrate_add_missing_columns()
    seed_kanban_columns()
    fix_missing_names()
    yield
    # Shutdown
    if client:
        await client.disconnect()

app = FastAPI(title="Telegram CRM", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
@app.get("/health")
async def health():
    global is_authenticated
    return {
        "status": "ok",
        "authenticated": is_authenticated,
        "importing": import_in_progress
    }

@app.post("/auth/login")
async def login(req: LoginRequest):
    """Initiate authentication with Telegram"""
    global client, is_authenticated
    phone = req.phone
    try:
        client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        await client.connect()

        if await client.is_user_authorized():
            is_authenticated = True
            logger.info("Already authenticated!")

            # Start listeners in background
            asyncio.create_task(start_listeners())
            asyncio.create_task(import_history())

            return {"status": "already_authorized"}

        result = await client.send_code_request(phone)
        return {
            "status": "code_sent",
            "phone_code_hash": result.phone_code_hash,
            "phone": phone
        }
    except Exception as e:
        logger.error(f"Login error: {e}")
        return JSONResponse({"error": str(e)}, status_code=400)

@app.post("/auth/verify")
async def verify_code(req: VerifyRequest):
    """Verify authentication code"""
    global client, is_authenticated
    phone = req.phone
    code = req.code
    try:
        await client.sign_in(phone, code)
        is_authenticated = True

        # Start listeners and import history in background
        asyncio.create_task(start_listeners())
        asyncio.create_task(import_history())

        return {
            "status": "authenticated",
            "message": "Importing historical data..."
        }
    except Exception as e:
        logger.error(f"Verification error: {e}")
        return JSONResponse({"error": str(e)}, status_code=400)

@app.get("/chats")
async def get_chats(skip: int = Query(0), limit: int = Query(50)):
    """Get all chats"""
    db = SessionLocal()
    try:
        chats = db.query(Chat).order_by(desc(Chat.last_message_at)).offset(skip).limit(limit).all()
        return chats
    finally:
        db.close()

@app.get("/chats/{chat_id}/messages")
async def get_messages(chat_id: int, skip: int = Query(0), limit: int = Query(50)):
    """Get messages from a chat"""
    db = SessionLocal()
    try:
        messages = db.query(Message).filter_by(chat_id=chat_id).order_by(Message.timestamp).offset(skip).limit(limit).all()
        return messages
    finally:
        db.close()

@app.post("/messages/send")
async def send_message(req: SendMessageRequest):
    """Send a message"""
    try:
        await client.send_message(req.chat_id, req.text)

        # Save to DB
        db = SessionLocal()
        try:
            now = datetime.now()
            msg = Message(
                telegram_msg_id=0,  # Will be updated by listener
                sender_id=0,
                sender_name="Você",
                chat_id=req.chat_id,
                text=req.text,
                is_outgoing=True,
                timestamp=now
            )
            db.add(msg)

            chat_obj = db.query(Chat).filter_by(telegram_id=req.chat_id).first()
            if chat_obj:
                chat_obj.last_message_at = now
                chat_obj.last_message_text = req.text

            db.commit()
        finally:
            db.close()

        return {"status": "sent"}
    except Exception as e:
        logger.error(f"Send message error: {e}")
        return JSONResponse({"error": str(e)}, status_code=400)

@app.get("/contacts")
async def get_contacts(skip: int = Query(0), limit: int = Query(50)):
    """Get all contacts"""
    db = SessionLocal()
    try:
        contacts = db.query(Contact).offset(skip).limit(limit).all()
        return contacts
    finally:
        db.close()

@app.get("/stats/summary")
async def get_stats_summary():
    """Aggregate metrics for the dashboard that don't fit in a simple list query"""
    db = SessionLocal()
    try:
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = datetime.now() - timedelta(days=7)

        messages_today = db.query(Message).filter(Message.timestamp >= today_start).count()
        messages_received_today = db.query(Message).filter(
            Message.timestamp >= today_start, Message.is_outgoing == False
        ).count()
        new_leads_7d = db.query(Lead).filter(Lead.created_at >= week_ago).count()

        return {
            "messages_today": messages_today,
            "messages_received_today": messages_received_today,
            "new_leads_7d": new_leads_7d,
        }
    finally:
        db.close()

@app.get("/leads")
async def get_leads(status: Optional[str] = None, skip: int = Query(0), limit: int = Query(50)):
    """Get all leads with optional status filter"""
    db = SessionLocal()
    try:
        query = db.query(Lead)
        if status:
            query = query.filter_by(status=status)
        leads = query.order_by(desc(Lead.updated_at)).offset(skip).limit(limit).all()
        return leads
    finally:
        db.close()

@app.get("/leads/export")
async def export_leads_csv():
    """Export all leads as a CSV file (opens directly in Excel)"""
    import csv
    import io

    db = SessionLocal()
    try:
        leads = db.query(Lead).order_by(desc(Lead.updated_at)).all()
        columns = {c.key: c.label for c in db.query(KanbanColumn).all()}

        buffer = io.StringIO()
        buffer.write('﻿')  # BOM so Excel renders acentos corretamente
        writer = csv.writer(buffer, delimiter=';')
        writer.writerow(['Nome', 'Telegram ID', 'Status', 'Tags', 'Notas', 'Criado em', 'Atualizado em'])
        for lead in leads:
            writer.writerow([
                lead.name,
                lead.telegram_id,
                columns.get(lead.status, lead.status),
                lead.tags or '',
                lead.notes or '',
                lead.created_at.strftime('%d/%m/%Y %H:%M') if lead.created_at else '',
                lead.updated_at.strftime('%d/%m/%Y %H:%M') if lead.updated_at else '',
            ])

        buffer.seek(0)
        filename = f"leads_{datetime.now().strftime('%Y-%m-%d')}.csv"
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    finally:
        db.close()

@app.put("/leads/{lead_id}")
async def update_lead(lead_id: int, lead_data: LeadSchema):
    """Update a lead"""
    db = SessionLocal()
    try:
        lead = db.query(Lead).filter_by(id=lead_id).first()
        if not lead:
            return JSONResponse({"error": "Lead not found"}, status_code=404)

        lead.status = lead_data.status
        lead.tags = lead_data.tags
        lead.notes = lead_data.notes
        lead.updated_at = datetime.now()
        db.commit()

        return lead
    finally:
        db.close()

@app.get("/kanban/columns")
async def get_kanban_columns():
    """Get all Kanban columns, in order"""
    db = SessionLocal()
    try:
        columns = db.query(KanbanColumn).order_by(KanbanColumn.position).all()
        return columns
    finally:
        db.close()

@app.post("/kanban/columns")
async def create_kanban_column(req: KanbanColumnCreate):
    """Add a new Kanban column"""
    db = SessionLocal()
    try:
        label = req.label.strip()
        if not label:
            return JSONResponse({"error": "Nome da coluna não pode ser vazio"}, status_code=400)

        key = slugify_column_key(label, db)
        max_position = db.query(KanbanColumn).count()
        column = KanbanColumn(key=key, label=label, color=req.color, position=max_position)
        db.add(column)
        db.commit()
        db.refresh(column)
        return column
    finally:
        db.close()

@app.put("/kanban/columns/{column_id}")
async def update_kanban_column(column_id: int, req: KanbanColumnUpdate):
    """Rename or recolor a Kanban column (key stays stable so leads keep their status)"""
    db = SessionLocal()
    try:
        column = db.query(KanbanColumn).filter_by(id=column_id).first()
        if not column:
            return JSONResponse({"error": "Coluna não encontrada"}, status_code=404)

        if req.label is not None and req.label.strip():
            column.label = req.label.strip()
        if req.color is not None:
            column.color = req.color
        db.commit()
        db.refresh(column)
        return column
    finally:
        db.close()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time updates"""
    await websocket.accept()
    connected_clients.add(websocket)
    logger.info(f"WebSocket connected. Total: {len(connected_clients)}")
    try:
        while True:
            data = await websocket.receive_text()
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        connected_clients.discard(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(connected_clients)}")

async def start_listeners():
    """Start listening for incoming messages"""
    if client:
        @client.on(events.NewMessage())
        async def handler(event):
            await on_new_message(event)

        logger.info("✓ Listeners started")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
