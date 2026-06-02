from fastapi import FastAPI, Depends
from pydantic import BaseModel

app = FastAPI(title="ACME API")


class HealthOut(BaseModel):
    status: str


@app.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    return HealthOut(status="ok")


# TODO: add the /users routes here — this is the file the agent edits in the demo.
