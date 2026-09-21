import os
import asyncio
from typing import Optional, List
from fastapi import FastAPI, WebSocket, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from telethon import TelegramClient, events
from telethon.tl.types import MessageService
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, desc
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
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
    unread_count = Column(Integer, default=0)

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True)
    contact_id = Column(Integer)
    telegram_id = Column(Integer)
    name = Column(String)
    status = Column(String, default="novo")  # novo, qualificado, negociando, ganho, perdido
    tags = Column(String, default="")  # comma-separated
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

Base.metadata.create_all(engine)

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
            sender_name=sender.first_name or getattr(sender, 'title', 'Unknown'),
            chat_id=chat.id,
            text=event.text or "[Media]",
            is_outgoing=event.out,
            timestamp=event.date
        )
        db.add(msg)

        # Update chat
        is_group = hasattr(chat, 'megagroup') or hasattr(chat, 'gigagroup')
        chat_obj = db.query(Chat).filter_by(telegram_id=chat.id).first()
        if chat_obj:
            chat_obj.last_message_at = event.date
            if not event.out:
                chat_obj.unread_count += 1
        else:
            new_chat = Chat(
                telegram_id=chat.id,
                name=getattr(chat, 'title', None) or getattr(sender, 'first_name', 'Unknown'),
                is_group=is_group,
                last_message_at=event.date
            )
            db.add(new_chat)

        # Auto-create contact + lead for brand new private chats
        is_new_lead = False
        if not is_group and not sender.bot:
            existing_lead = db.query(Lead).filter_by(telegram_id=sender.id).first()
            if not existing_lead:
                db.merge(Contact(
                    telegram_id=sender.id,
                    name=sender.first_name or 'Desconhecido',
                    username=getattr(sender, 'username', None),
                    is_bot=sender.bot
                ))
                db.add(Lead(
                    contact_id=sender.id,
                    telegram_id=sender.id,
                    name=sender.first_name or 'Desconhecido',
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
                        "sender_name": sender.first_name or getattr(sender, 'title', 'Unknown'),
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
        dialogs = await client.get_dialogs()

        for idx, dialog in enumerate(dialogs):
            try:
                chat = dialog.entity

                # Save chat
                chat_name = getattr(chat, 'title', None) or getattr(chat, 'first_name', 'Unknown')
                is_group = hasattr(chat, 'megagroup') or hasattr(chat, 'gigagroup')

                chat_obj = Chat(
                    telegram_id=chat.id,
                    name=chat_name,
                    is_group=is_group,
                    last_message_at=datetime.now(),
                    unread_count=dialog.unread_count or 0
                )
                db.merge(chat_obj)

                # Save contact if private chat
                if not is_group and hasattr(chat, 'first_name'):
                    contact = Contact(
                        telegram_id=chat.id,
                        name=chat.first_name,
                        username=getattr(chat, 'username', None),
                        is_bot=getattr(chat, 'bot', False)
                    )
                    db.merge(contact)

                    # Create lead
                    lead = Lead(
                        contact_id=chat.id,
                        telegram_id=chat.id,
                        name=chat.first_name,
                        status="novo"
                    )
                    db.merge(lead)

                # Get message history (limit to 100 per chat to avoid rate limiting)
                msg_count = 0
                async for msg in client.iter_messages(chat, limit=100):
                    try:
                        sender = await msg.get_sender()
                        if not sender:
                            continue

                        message = Message(
                            telegram_msg_id=msg.id,
                            sender_id=sender.id,
                            sender_name=sender.first_name or getattr(sender, 'title', 'Unknown'),
                            chat_id=chat.id,
                            text=msg.text or "[Media]",
                            is_outgoing=msg.out,
                            timestamp=msg.date
                        )
                        db.merge(message)
                        msg_count += 1
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
                        continue

                db.commit()
                logger.info(f"✓ Chat '{chat_name}' - {msg_count} messages imported")

            except Exception as e:
                logger.error(f"Error processing chat: {e}")
                continue

        logger.info("✓ Historical import completed!")
    except Exception as e:
        logger.error(f"Error importing history: {e}")
    finally:
        import_in_progress = False
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
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
async def login(phone: str):
    """Initiate authentication with Telegram"""
    global client, is_authenticated
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
async def verify_code(phone: str, code: str):
    """Verify authentication code"""
    global client, is_authenticated
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
            msg = Message(
                telegram_msg_id=0,  # Will be updated by listener
                sender_id=0,
                sender_name="Você",
                chat_id=req.chat_id,
                text=req.text,
                is_outgoing=True,
                timestamp=datetime.now()
            )
            db.add(msg)
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
