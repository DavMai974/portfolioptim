from time import sleep
import redis
from fastapi import FastAPI, WebSocket
import yfinance as yf
import asyncio
import json

app = FastAPI()


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

class WrapperAsyncWebSocket(yf.AsyncWebSocket):
    
    def __init__(self, url: str = "wss://streamer.finance.yahoo.com/?version=2", verbose=True):
        """
        Initialize the AsyncWebSocket client.

        Args:
            url (str): The WebSocket server URL. Defaults to Yahoo Finance's WebSocket URL.
            verbose (bool): Flag to enable or disable print statements. Defaults to True.
        """
        super().__init__(url, verbose)
        self._message_handler = None  # Callable to handle messages
        self._heartbeat_task = None  # Task to send heartbeat subscribe
        
    async def listen(self, message_handler=None, args=None):
        """
        Start listening to messages from the WebSocket server.

        Args:
            message_handler (Optional[Callable[[dict], None]]): Optional function to handle received messages.
        """
        await self._connect()
        self._message_handler = message_handler

        self.logger.info("Listening for messages...")
        if self.verbose:
            print("Listening for messages...")

        # Start heartbeat subscription task
        if self._heartbeat_task is None:
            self._heartbeat_task = asyncio.create_task(self._periodic_subscribe())

        while True:
            try:
                async for message in self._ws:
                    message_json = json.loads(message)
                    encoded_data = message_json.get("message", "")
                    decoded_message = self._decode_message(encoded_data)
                    if self._message_handler:
                        try:
                            if asyncio.iscoroutinefunction(self._message_handler):
                                await self._message_handler(str(decoded_message), args)
                            else:
                                self._message_handler(str(decoded_message), args)
                        except Exception as handler_exception:
                            self.logger.error("Error in message handler: %s", handler_exception, exc_info=True)
                            if self.verbose:
                                print("Error in message handler:", handler_exception)
                    else:
                        print(decoded_message)

            except (KeyboardInterrupt, asyncio.CancelledError):
                self.logger.info("WebSocket listening interrupted. Closing connection...")
                if self.verbose:
                    print("WebSocket listening interrupted. Closing connection...")
                await self.close()
                break

            except Exception as e:
                self.logger.error("Error while listening to messages: %s", e, exc_info=True)
                if self.verbose:
                    print("Error while listening to messages: %s", e)

                # Attempt to reconnect if connection drops
                self.logger.info("Attempting to reconnect...")
                if self.verbose:
                    print("Attempting to reconnect...")
                await asyncio.sleep(3)  # backoff
                await self._connect()

async def send_text(message, websocket):
    print(message)
    await websocket.send_text(message)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    tickers = await websocket.receive_text()
    if tickers:
        async with WrapperAsyncWebSocket() as ws:
            await ws.subscribe([tickers])
            await ws.listen(send_text, websocket)