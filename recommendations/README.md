# Recommendation Service

Python micro-service that powers the personalised auction recommendations using
matrix factorisation. The service is intentionally lightweight so it can be run
locally during development and queried from the Node backend.

## Project structure

```
recommendations/
├── app.py                # FastAPI entrypoint
├── data_loader.py        # Dataset parsing helpers (eBay XML format)
├── model.py              # Pure NumPy matrix-factorisation implementation
├── schemas.py            # Pydantic request/response models
├── requirements.txt      # Python dependencies
└── ebay/                 # Provided dataset (XML files)
```

## Setup

```bash
cd recommendations
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Running the API

```bash
uvicorn app:app --reload --port 8090
```

On startup the service will look for the dataset under `recommendations/ebay`.
If present it parses the XML files, fits the matrix-factorisation model and
keeps the factors in memory. The initial logs confirm how many interactions were
loaded.

## API endpoints

All endpoints are served under `http://localhost:8090/` when running locally.

| Method | Path              | Description |
|--------|------------------|-------------|
| GET    | `/health`         | Service status and whether a model is trained. |
| POST   | `/train`          | Re-train the recommender. Optionally provide `dataset_dir` and `implicit_value` in the JSON payload. |
| POST   | `/interactions`   | Append new user/item interactions (list of `{user_id, item_id, value}`) and re-train. |
| POST   | `/recommendations`| Body: `{ "user_id": "...", "limit": 8 }`. Returns ranked auction IDs. |
| GET    | `/popular`        | Returns the globally most popular auctions. |

## Matrix factorisation details

* Implemented from scratch with NumPy.
* Optimises squared error via stochastic gradient descent.
* Supports cold-start fallback by returning globally popular auctions.
* Stores user/item mappings in-memory for quick scoring.

## Parsing the dataset

`data_loader.load_interactions()` expects the e-class dataset format: XML files
named `items-*.xml`. For each `<Bid>` entry it generates an explicit interaction
using the bid amount as the signal (defaults to `1.0` if parsing fails). Extra
visitation information can be incorporated by extending `data_loader.py`.

If you add additional activity logs (e.g., page visits) store them as
`Interaction` tuples `(user_id, item_id, value)` and call `/interactions` to
ingest them.

## Integration plan

1. Run the service alongside the Node backend (e.g., via docker-compose).
2. From the backend, call `/recommendations` with the authenticated user id to
   retrieve personalised auction ids.
3. Map the returned ids to auction documents and display the items in the UI.

Feel free to extend the service with persistence, scheduled re-training, or
more advanced models once the baseline experience is in place.
