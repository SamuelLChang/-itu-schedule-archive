import os
import time
from datetime import datetime
import pandas as pd
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://obs.itu.edu.tr"
SCHEDULE_URL = f"{BASE_URL}/public/DersProgram/DersProgramSearch"
COURSE_CODES_URL = f"{BASE_URL}/public/DersProgram/SearchBransKoduByProgramSeviye"
LEVELS = {
    "associate": "OL",
    "undergraduate": "LS",
    "graduate": "LU",
    "graduate_evening": "LUI"
}


def get_session():
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    })
    return session


def extract_table(html):
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", {"id": "dersProgramContainer"})
    if not table:
        return None

    rows = []
    for tr in table.select("tbody tr"):
        tds = tr.find_all("td")
        row = []
        for td in tds:
            text = td.get_text(separator='<br>').strip().replace(
                "\n", " ").replace("  ", " ")
            row.append(text if text else '-')
        rows.append(row)

    if rows:
        return pd.DataFrame(rows, columns=[
            "CRN", "Course Code", "Course Title", "Teaching Method",
            "Instructor", "Building", "Day", "Time", "Room", "Capacity",
            "Enrolled", "Reservation", "Major Restriction", "Prerequisites", "Credit/Class Resc."
        ])
    return None


def get_term(session):
    response = session.get(f"{BASE_URL}/public/DersProgram")
    if response.status_code != 200:
        print("Failed to load main page")
        return "unknown_term"
    soup = BeautifulSoup(response.text, "html.parser")
    term_element = soup.find("h1", {"id": "baslik1"})
    return term_element.text.strip() if term_element else "unknown_term"


def get_course_codes(session, level_code):
    response = session.get(COURSE_CODES_URL, params={
                           "programSeviyeTipiAnahtari": level_code})
    if response.status_code != 200:
        print(f"Failed to load course codes for level {level_code}")
        return []

    try:
        data = response.json()
        return [(str(item["bransKoduId"]), item["dersBransKodu"]) for item in data if item.get("bransKoduId") and item.get("dersBransKodu")]
    except ValueError:
        print(f"Invalid JSON response for level {level_code}")
        return []


def scrape_all_levels():
    # Compute repository root and archive path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(os.path.dirname(
        script_dir))  # Up to repository root
    archive_base_dir = os.path.join(repo_root, "Archive")

    session = get_session()
    term_text = get_term(session)
    term_folder = term_text.replace(" ", "_")
    today = datetime.now().strftime("%Y-%m-%d")
    date_folder = os.path.join(archive_base_dir, term_folder, today)

    for level_name, level_code in LEVELS.items():
        print(f"\n== {level_name.upper()} ==")
        try:
            course_codes = get_course_codes(session, level_code)
            print(f"[•] Found {len(course_codes)} course codes")

            level_path = os.path.join(date_folder, level_name)
            os.makedirs(level_path, exist_ok=True)

            for value, label in course_codes:
                try:
                    params = {
                        "programSeviyeTipiAnahtari": level_code,
                        "dersBransKoduId": value
                    }
                    response = session.get(SCHEDULE_URL, params=params)
                    if response.status_code != 200:
                        print(
                            f"[!] Failed {label}: Bad response ({response.status_code})")
                        continue

                    df = extract_table(response.text)
                    if df is not None:
                        filename = f"{label}.csv"
                        file_path = os.path.join(level_path, filename)
                        df.to_csv(file_path, index=False, encoding='utf-8')
                        print(f"[✓] Saved → {file_path}")
                    else:
                        print(f"[ ] No data for {label}")
                    time.sleep(0.5)
                except Exception as e:
                    print(f"[!] Failed {label}: {e}")
        except Exception as e:
            print(f"[!] Failed level {level_name}: {e}")
            continue

    with open(os.path.join(date_folder, "scraped_at.txt"), "w", encoding='utf-8') as f:
        f.write(
            f"Scraped at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")


if __name__ == "__main__":
    scrape_all_levels()
