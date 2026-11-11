"""Generates 500 mock job listings into jobs.json with a fixed random seed.

No LLM involved. Output is repeatable: same seed -> same 500 listings.
closes_days is stored relative to today so seed.py always produces fresh
deadlines no matter when the database is seeded.
"""

import json
import datetime
import os
import random

OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jobs.json")
TOTAL_JOBS = 500

# 12 role families, each with its own skill pool and title variants.
ROLE_FAMILIES = [
    {
        "family": "Data Analyst",
        "titles": ["Data Analyst", "Business Data Analyst", "Junior Data Analyst"],
        "skills": ["SQL", "Excel", "Python", "Power BI", "Tableau", "Pandas", "Statistics", "Data Visualization", "Google Analytics"],
    },
    {
        "family": "Backend Engineer",
        "titles": ["Backend Engineer Intern", "Backend Developer", "API Engineer (Fresher)"],
        "skills": ["Python", "Java", "Node.js", "FastAPI", "Spring Boot", "PostgreSQL", "MongoDB", "Redis", "REST APIs", "Docker", "Git"],
    },
    {
        "family": "Frontend Engineer",
        "titles": ["Frontend Developer Intern", "Frontend Engineer", "React Developer (Fresher)"],
        "skills": ["JavaScript", "TypeScript", "React", "HTML/CSS", "Tailwind CSS", "Next.js", "Redux", "Jest", "Figma to Code"],
    },
    {
        "family": "Full-stack Engineer",
        "titles": ["Full Stack Developer Intern", "Full Stack Engineer", "MERN Stack Developer"],
        "skills": ["React", "Node.js", "TypeScript", "PostgreSQL", "MongoDB", "Express", "Next.js", "AWS Basics", "Git", "REST APIs"],
    },
    {
        "family": "ML Engineer",
        "titles": ["Machine Learning Intern", "ML Engineer (Fresher)", "Applied ML Engineer"],
        "skills": ["Python", "PyTorch", "TensorFlow", "scikit-learn", "Pandas", "NumPy", "NLP", "Computer Vision", "MLflow", "SQL"],
    },
    {
        "family": "Data Engineer",
        "titles": ["Data Engineer Intern", "Junior Data Engineer", "ETL Developer"],
        "skills": ["Python", "SQL", "Apache Spark", "Airflow", "Kafka", "dbt", "AWS Glue", "Snowflake", "PostgreSQL", "ETL Design"],
    },
    {
        "family": "QA Engineer",
        "titles": ["QA Engineer Intern", "Software Test Engineer", "SDET (Fresher)"],
        "skills": ["Manual Testing", "Selenium", "Pytest", "Java", "Postman", "JMeter", "API Testing", "Cypress", "TestNG"],
    },
    {
        "family": "DevOps Engineer",
        "titles": ["DevOps Intern", "Site Reliability Engineer (Fresher)", "Cloud Ops Engineer"],
        "skills": ["Linux", "Docker", "Kubernetes", "AWS", "Terraform", "Jenkins", "CI/CD", "Bash", "Prometheus", "Git"],
    },
    {
        "family": "Android Developer",
        "titles": ["Android Developer Intern", "Android Engineer", "Kotlin Developer (Fresher)"],
        "skills": ["Kotlin", "Java", "Jetpack Compose", "Android SDK", "Room DB", "Retrofit", "Firebase", "REST APIs", "Git"],
    },
    {
        "family": "UI/UX Designer",
        "titles": ["UI/UX Design Intern", "Product Designer (Fresher)", "Interaction Designer"],
        "skills": ["Figma", "Adobe XD", "Wireframing", "Prototyping", "Design Systems", "User Research", "Usability Testing", "Typography"],
    },
    {
        "family": "Cybersecurity Analyst",
        "titles": ["Security Analyst Intern", "SOC Analyst (L1)", "Application Security Engineer (Fresher)"],
        "skills": ["Network Security", "Burp Suite", "OWASP Top 10", "Linux", "Python", "Wireshark", "Incident Response", "Vulnerability Assessment", "SIEM Tools"],
    },
    {
        "family": "Product Analyst",
        "titles": ["Product Analyst Intern", "Associate Product Analyst", "Product Ops Analyst"],
        "skills": ["SQL", "A/B Testing", "Mixpanel", "Amplitude", "Excel", "Python", "Market Research", "Roadmapping", "Data Visualization"],
    },
]

# Fictional companies: invented word + suffix pairs, checked against common
# real Indian tech employers at authoring time.
COMPANY_WORDS = [
    "Kavach", "PrismCloud", "Nimbus", "Zentara", "Veltrix", "Aranya", "Quillstone", "Meridian",
    "Solstice", "Banyanroot", "Cinderlake", "Driftwave", "Emberly", "Fernbyte", "Glimmerworks",
    "Halcyon", "Indigofold", "Jasminetech", "Kestrel", "Lumenark", "Mosswood", "Nocturne",
    "Opaline", "Peppercorn", "Quartzite", "Ravenhurst", "Saffronpeak", "Tinderbox", "Umbrafold",
    "Verdanta", "Wispera", "Xenolith", "Yarrowtech", "Zephyrion", "Aurinova", "Brindlebay",
    "Copperleaf", "Duskfield", "Elmridge", "Foxglove", "Granitewell", "Hollowpine", "Ivorytek",
    "Junipertide", "Kelpstone", "Lotusward", "Mapleforge", "Nettleworks", "Ochrepos", "Pinewhisper",
    "Quiverleaf", "Rosemark", "Slateglass", "Thistlecore", "Undergrove", "Vantablue", "Willowgrid",
    "Amberwyn", "Birchline", "Cobaltmarsh", "Dapplemere", "Everloft", "Foglight", "Giltfern",
    "Hearthgate", "Ironbloom", "Jadefall", "Kindleworth", "Larkspur", "Moonquill", "Norvale",
    "Oxbow", "Palewood", "Quietforge", "Rimewater", "Stonewhistle", "Tidewalk", "Umberleaf",
    "Vellum", "Wildmoor", "Zincline",
]
COMPANY_SUFFIXES = [
    "Systems", "Labs", "Technologies", "Works", "Analytics", "Networks", "Digital",
    "Software", "Studio", "Solutions", "Robotics", "Interactive", "Dynamics", "Ventures",
]

LOCATIONS = {
    "Bengaluru": 90,
    "Hyderabad": 80,
    "Pune": 70,
    "Chennai": 55,
    "Gurugram": 55,
    "Mumbai": 55,
    "Kolkata": 40,
    "Patna": 25,
    "Remote": 30,
}

TEAMS = ["Platform", "Core Product", "Growth", "Data", "Infrastructure", "Mobile", "Design Systems", "Security"]
STAGES = ["early-stage", "series-A", "series-B", "bootstrapped", "product-led"]


def build_companies(rng: random.Random) -> list:
    """120 unique fictional company names, deterministic under the fixed seed."""
    pairs = [(w, s) for w in COMPANY_WORDS for s in COMPANY_SUFFIXES]
    rng.shuffle(pairs)
    companies, used_words = [], {}
    for word, suffix in pairs:
        if len(companies) >= 120:
            break
        # Use each invented word at most twice so names stay varied.
        if used_words.get(word, 0) >= 2:
            continue
        companies.append(f"{word} {suffix}")
        used_words[word] = used_words.get(word, 0) + 1
    assert len(companies) == 120, f"only built {len(companies)} companies"
    return companies


def stipend_or_ctc(rng: random.Random, job_type: str) -> str:
    if job_type == "internship":
        amount = rng.choice([15000, 20000, 25000, 30000, 35000, 40000, 45000])
        return f"₹{amount:,}/month"
    low = rng.choice([6, 8, 10, 12, 14, 16])
    high = low + rng.choice([2, 4, 6])
    return f"₹{low}–{high} LPA"


def build_description(rng: random.Random, title: str, company: str, location: str,
                      job_type: str, skills: list) -> str:
    team = rng.choice(TEAMS)
    stage = rng.choice(STAGES)
    skill_a = skills[0]
    skill_b = skills[1] if len(skills) > 1 else skills[0]

    s1 = rng.choice([
        f"{company} is hiring a {title} to join the {team} team in {location}.",
        f"{company}, a {stage} product company based in {location}, is adding a {title} to its {team} team.",
        f"The {team} team at {company} ({location}) is opening a {title} position this quarter.",
    ])
    s2 = rng.choice([
        f"Day to day you will ship production work using {skill_a} and {skill_b}, with weekly demos and code reviews.",
        f"You will own small features end to end, pairing with senior teammates on {skill_a} problems.",
        f"Expect hands-on work with {skill_a}, {skill_b}, and the rest of the team's toolkit from your first week.",
    ])
    if job_type == "internship":
        s3 = rng.choice([
            "This is a 3-6 month internship with a pre-placement offer track for strong performers.",
            "Open to students graduating in 2025 or 2026; mentors are assigned in week one.",
            "The internship runs alongside the semester with flexible hours during exam weeks.",
        ])
    else:
        s3 = rng.choice([
            "This is a full-time fresher role with six weeks of structured onboarding before you join a delivery squad.",
            "Open to 2025 graduates; no prior work experience required, portfolio or projects preferred.",
            "You will be measured against clear 30-60-90 day goals with a senior buddy and monthly reviews.",
        ])
    return f"{s1} {s2} {s3}"


def generate() -> list:
    rng = random.Random(42)  # fixed seed: repeatable output
    companies = build_companies(rng)

    # Exact family counts: 8 families x 42 + 4 families x 41 = 500.
    families = []
    for i, fam in enumerate(ROLE_FAMILIES):
        families += [fam] * (42 if i < 8 else 41)
    assert len(families) == TOTAL_JOBS
    rng.shuffle(families)

    # Exact job-type split: 55% internship (275), 45% full-time (225).
    job_types = ["internship"] * 275 + ["full-time"] * 225
    rng.shuffle(job_types)

    # Exact location split from the weights table.
    locations = [loc for loc, count in LOCATIONS.items() for _ in range(count)]
    assert len(locations) == TOTAL_JOBS
    rng.shuffle(locations)

    jobs, used_pairs = [], set()
    for i in range(TOTAL_JOBS):
        fam = families[i]
        job_type = job_types[i]
        location = locations[i]

        title = rng.choice(fam["titles"])
        company = rng.choice(companies)
        while (title, company) in used_pairs:  # no duplicate role+company pairs
            company = rng.choice(companies)
        used_pairs.add((title, company))

        skills = rng.sample(fam["skills"], rng.randint(4, 6))
        closes_days = rng.randint(1, 28)  # deadlines spread across the next 4 weeks

        jobs.append({
            "role": title,
            "company": company,
            "location": location,
            "type": job_type,
            "stipend_or_ctc": stipend_or_ctc(rng, job_type),
            "closes_days": closes_days,
            "closes_on": (datetime.date.today() + datetime.timedelta(days=closes_days)).isoformat(),
            "description": build_description(rng, title, company, location, job_type, skills),
            "required_skills": skills,
            "family": fam["family"],
        })

    assert len(jobs) == TOTAL_JOBS
    assert len(used_pairs) == TOTAL_JOBS
    return jobs


if __name__ == "__main__":
    data = generate()
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    internships = sum(1 for j in data if j["type"] == "internship")
    print(f"Wrote {len(data)} jobs to {OUTPUT_PATH} "
          f"({internships} internships, {len(data) - internships} full-time)")
