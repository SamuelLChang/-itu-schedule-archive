import os
import pandas as pd
from pathlib import Path
import json

# Compute repository root and set paths
script_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.dirname(os.path.dirname(
    script_dir))  # Up to repository root
ARCHIVE_BASE_DIR = os.path.join(repo_root, "Archive")
WEBSITE_DATA_DIR = os.path.join(
    repo_root, "Program", "Website", "static", "data")


def convert_csvs_to_json():
    os.makedirs(WEBSITE_DATA_DIR, exist_ok=True)
    terms = [d.name for d in Path(ARCHIVE_BASE_DIR).iterdir() if d.is_dir()]

    # Save terms.json at the root of data/
    with open(os.path.join(WEBSITE_DATA_DIR, "terms.json"), "w", encoding="utf-8") as f:
        json.dump(terms, f, ensure_ascii=False, indent=2)

    # Process each term
    for term in terms:
        term_path = Path(ARCHIVE_BASE_DIR) / term
        dates = [d.name for d in term_path.iterdir() if d.is_dir()]
        if not dates:
            continue
        latest_date = max(dates)
        term_data = {}
        levels = [d.name for d in (
            term_path / latest_date).iterdir() if d.is_dir()]

        # Create subfolder for the term
        term_output_dir = os.path.join(
            WEBSITE_DATA_DIR, term.replace(" ", "_"))
        os.makedirs(term_output_dir, exist_ok=True)

        # Save levels.json for the term
        with open(os.path.join(term_output_dir, "levels.json"), "w", encoding="utf-8") as f:
            json.dump(levels, f, ensure_ascii=False, indent=2)

        # Process courses and schedule data
        term_data = {}
        for level in levels:
            level_path = term_path / latest_date / level
            courses = [f.stem for f in level_path.glob("*.csv")]
            term_data[level] = {}

            for course in courses:
                csv_path = level_path / f"{course}.csv"
                df = pd.read_csv(csv_path, dtype=str).fillna('-')
                term_data[level][course] = df.to_dict(orient="records")

        # Save schedule_data.json for the term
        with open(os.path.join(term_output_dir, "schedule_data.json"), "w", encoding="utf-8") as f:
            json.dump(term_data, f, ensure_ascii=False, indent=2)

        # Save courses.json for each level within the term
        for level in levels:
            level_path = term_path / latest_date / level
            courses = [f.stem for f in level_path.glob("*.csv")]
            with open(os.path.join(term_output_dir, f"{level}_courses.json"), "w", encoding="utf-8") as f:
                json.dump(courses, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    convert_csvs_to_json()
