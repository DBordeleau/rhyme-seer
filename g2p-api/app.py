from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from g2p import make_g2p
from g2p.app import APP as G2P_APP
import os
import logging
import uvicorn

app = FastAPI()

@app.get("/api/v1/g2p")
async def g2p_endpoint(
    text: str = Query(...),
    in_lang: str = Query(..., alias="in-lang"),
    out_lang: str = Query(..., alias="out-lang")
):
    transducer = make_g2p(in_lang, out_lang)
    result = transducer(text)
    return {
        "input-text": text,
        "output-text": result.output_string
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the G2P app at a different path to avoid conflict
app.mount("/api/v1/engine", G2P_APP)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    logger.info(f"Starting G2P API server on port {port}")
    logger.info(f"API docs at http://localhost:{port}/docs")

    uvicorn.run(app, host="0.0.0.0", port=port)

    for route in app.routes:
        print(f"Route: {getattr(route, 'path', 'no path')} -> {getattr(route, 'endpoint', 'no endpoint')}")
