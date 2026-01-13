import csv
import json
import os
from typing import List, Dict, Any
from sqlmodel import Session, select
from app.models.federation_models import Federation
from app.models.library_models import Element
from app.models.reference_models import AdultAgeClass, CompetitiveLevel, TestLevel

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data") # backend/app/data
SEEDS_DIR = os.path.join(os.path.dirname(__file__), "seeds") # backend/app/core/seeds

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

def seed_reference_data(session: Session):
    # 1. Adult Age Classes
    with open(os.path.join(SEEDS_DIR, "adult_class_logic.json"), "r") as f:
        adult_data = json.load(f)
        for item in adult_data.get("age_classes", []):
            existing = session.exec(select(AdultAgeClass).where(AdultAgeClass.code == item["id"])).first()
            if not existing:
                session.add(AdultAgeClass(
                    code=item["id"],
                    name=item["name"],
                    min_age=item["min_age"],
                    max_age=item["max_age"]
                ))
    
    # 2. Competitive Hierarchies
    with open(os.path.join(SEEDS_DIR, "competitive_hierarchies.json"), "r") as f:
        comp_data = json.load(f)
        for fed, disciplines in comp_data.items():
            for discipline, levels in disciplines.items():
                for lvl in levels:
                    # Handle object vs string structure
                    if isinstance(lvl, dict):
                        name = lvl["level"]
                        anchor = lvl.get("isu_anchor")
                    else:
                        name = lvl
                        anchor = None
                    
                    # Deduplicate simplistic check
                    existing = session.exec(select(CompetitiveLevel).where(
                        CompetitiveLevel.federation == fed,
                        CompetitiveLevel.discipline == discipline,
                        CompetitiveLevel.name == name
                    )).first()
                    if not existing:
                        session.add(CompetitiveLevel(
                            federation=fed,
                            discipline=discipline,
                            name=name,
                            isu_anchor=anchor
                        ))

    # 3. Test Hierarchies
    with open(os.path.join(SEEDS_DIR, "test_hiearchies.json"), "r") as f:
        test_data = json.load(f)
        for fed, disciplines in test_data.items():
            for discipline, levels in disciplines.items():
                if not levels: continue
                # Handle list of strings vs list of objects
                if isinstance(levels, list):
                    for lvl in levels:
                        if isinstance(lvl, str):
                             session.add(TestLevel(federation=fed, discipline=discipline, level_name=lvl))
                        elif isinstance(lvl, dict):
                             # Pattern Dance structure
                             session.add(TestLevel(
                                 federation=fed, 
                                 discipline=discipline, 
                                 level_name=lvl["level"],
                                 sub_tests=lvl.get("tests", []),
                                 completion_rule=lvl.get("completion_rule")
                             ))
                elif isinstance(levels, dict):
                     # e.g. "Freeskate": { "elements": [...], "programs": [...] }
                     # Flatten or store specific types?
                     # For now, let's treat "elements" and "programs" as sub-disciplines
                     for sub_type, sub_levels in levels.items():
                         if isinstance(sub_levels, list):
                             for sl in sub_levels:
                                 session.add(TestLevel(
                                     federation=fed, 
                                     discipline=f"{discipline}_{sub_type}", 
                                     level_name=sl,
                                     completion_rule=levels.get("completion_rule") if isinstance(levels, dict) else None
                                 ))

    session.commit()
    return "Reference Data Seeded"