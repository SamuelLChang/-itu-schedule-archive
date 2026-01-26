# 🎓 ITU Schedule Archive

> **Browse and plan your courses at Istanbul Technical University**

🌐 **[Live Website →](https://itu-schedule-archive.vercel.app/)**

---

## ✨ Features

### 📚 Course Archive
Browse through **thousands of courses** from past semesters. Data is sourced directly from ITU's public records and updated regularly.

- Filter by academic term, course level, and subject code
- View detailed course information including instructors, schedules, and capacity
- Search across all available courses

### 🧙 Schedule Wizard
Plan your perfect semester with our interactive wizard:

1. **Select your courses** from available options
2. **Preview your timetable** in a visual calendar
3. **Export your schedule** as an image

### 📅 Calendar View
Visualize your weekly schedule with:

- Color-coded course cards
- Time slot grid view
- Export to PNG/PDF for sharing

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Styling** | Tailwind CSS |
| **Database** | Turso (libSQL) |
| **ORM** | Prisma |
| **Deployment** | Vercel |
| **Data Source** | ITU OBS (automated scraping) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/SamuelLChang/-itu-schedule-archive.git
cd itu-schedule-archive

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 📊 Data Updates

Course data is automatically scraped from ITU OBS on the **1st and 15th of each month** via GitHub Actions. You can also trigger a manual scrape:

```bash
npm run scrape
```

---

## 📝 License

This project is for educational purposes. Course data belongs to Istanbul Technical University.

---

<p align="center">
  Made with ❤️ for ITU students
</p>
