import csv
import json
import os
from typing import List, Dict, Any
from sqlmodel import Session, select
from app.models.federation_models import Federation
from app.models.library_models import Element

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

def seed_federations(session: Session) -> Dict[str, int]:
    json_path = os.path.join(DATA_DIR, "initial_data.json")
    if not os.path.exists(json_path):
        return {"count": 0, "status": "file_not_found"}

    with open(json_path, "r") as f:
        data = json.load(f)

    count = 0
    for item in data:
        if item["model"] == "api.federation":
            fields = item["fields"]
            code = fields["code"]
            
            # Check if exists
            statement = select(Federation).where(Federation.code == code)
            existing = session.exec(statement).first()
            
            if not existing:
                fed = Federation(
                    name=fields["name"],
                    code=code,
                    iso_code=fields.get("iso_code")
                )
                session.add(fed)
                count += 1
    
    session.commit()
    return {"count": count, "status": "success"}

def seed_elements(session: Session) -> Dict[str, Any]:
    files = [f for f in os.listdir(DATA_DIR) if f.endswith(".csv")]
    total_added = 0
    details = {}

    for filename in files:
        file_path = os.path.join(DATA_DIR, filename)
        category = filename.replace(".csv", "").title() # "ice dance.csv" -> "Ice Dance"
        
        added_in_file = 0
        with open(file_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Mapping: Abbreviation -> code, Element_Name -> name, BASE -> base_value
                code = row.get("Abbreviation")
                name = row.get("Element_Name")
                base_val_str = row.get("BASE")

                if code and name and base_val_str:
                    try:
                        base_value = float(base_val_str)
                    except ValueError:
                        continue # Skip invalid base values

                    # Check existence (by code AND category to be safe, though code should be unique ideally)
                    # For MVP, just checking code might be enough, but different disciplines might reuse codes?
                    # Let's check code + category.
                    statement = select(Element).where(Element.code == code, Element.category == category)
                    existing = session.exec(statement).first()

                    if not existing:
                        element = Element(
                            code=code,
                            name=name,
                            category=category,
                            base_value=base_value
                        )
                        session.add(element)
                        added_in_file += 1
        
        details[filename] = added_in_file
        total_added += added_in_file

    session.commit()
    return {"total_added": total_added, "details": details}
