from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Iterable, List, Tuple

Interaction = Tuple[str, str, float]

# Strip everything that isn't part of a number (digits, dot, minus)
NUM_STRIP_RE = re.compile(r"[^0-9.\-]+")


def parse_amount(raw: str | None, default: float = 1.0) -> float:
    if not raw:
        return default
    cleaned = NUM_STRIP_RE.sub("", raw).strip()
    if not cleaned:
        return default
    try:
        return float(cleaned)
    except ValueError:
        return default


def load_interactions(dataset_dir: Path | str, *, implicit_value: float = 1.0) -> List[Interaction]:
    dataset_dir = Path(dataset_dir)
    if not dataset_dir.exists():
        raise FileNotFoundError(f"Dataset directory not found: {dataset_dir}")

    interactions: List[Interaction] = []
    xml_files = sorted(dataset_dir.glob("items-*.xml"))

    for xml_file in xml_files:
        for record in _parse_items_file(xml_file, implicit_value=implicit_value):
            interactions.append(record)

    return interactions


def _parse_items_file(path: Path, *, implicit_value: float) -> Iterable[Interaction]:
    try:
        tree = ET.parse(path)
    except ET.ParseError as exc:
        print(f"[WARN] Skipping malformed XML {path}: {exc}")
        return []

    root = tree.getroot()
    results: List[Interaction] = []

    for item in root.findall("Item"):
        item_id_el = item.find("ItemID")
        if item_id_el is None or not item_id_el.text:
            continue
        item_id = item_id_el.text.strip()

        bids_el = item.find("Bids")
        if bids_el is not None:
            for bid in bids_el.findall("Bid"):
                bidder_el = bid.find("Bidder")
                amount_el = bid.find("Amount")
                if bidder_el is None:
                    continue
                user_id = bidder_el.get("UserID") or bidder_el.findtext("UserID")
                if not user_id:
                    continue
                user_id = user_id.strip()
                amount = parse_amount(amount_el.text if amount_el is not None else None, implicit_value)
                results.append((user_id, item_id, amount))

        # Treat visits/watchers as implicit feedback if available
        visitors_el = item.find("VisitCount")
        if visitors_el is not None and visitors_el.text:
            try:
                visit_count = int(visitors_el.text)
            except ValueError:
                visit_count = 0
            if visit_count > 0:
                results.append((f"__visitors__{item_id}", item_id, float(visit_count)))

        # If there are no bids or visit counts, create a popularity signal so the
        # service can be trained and return reasonable fallbacks during cold start.
        if not any(r[1] == item_id for r in results[-10:]):  # quick check of last few adds
            num_bids_el = item.find("Number_of_Bids")
            first_bid_el = item.find("First_Bid")
            currently_el = item.find("Currently")
            val = 0.0
            if num_bids_el is not None and (num_bids_el.text or "").strip():
                try:
                    val = float(num_bids_el.text)
                except ValueError:
                    val = 0.0
            if val <= 0.0:
                val = parse_amount((first_bid_el.text if first_bid_el is not None else None) or (currently_el.text if currently_el is not None else None), implicit_value)
            if val <= 0:
                val = implicit_value
            # Single pseudo-user providing an implicit interaction
            results.append(("__pop__", item_id, float(val)))

    return results
