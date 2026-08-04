/* Every claim and number traces to the master CV. Do not edit figures here
   without checking the source. */

export const experience = [
  { years: '2025 - 2026', role: "AI Research Engineer, Master's Thesis", org: 'Valamis Group Oy' },
  { years: '2025', role: 'AI Research Intern', org: 'Centre for Wireless Communications, University of Oulu' },
  { years: '2023 - 2024', role: 'Technical Project Manager', org: 'ZeePalm' },
  { years: '2022', role: 'Software Developer', org: 'GrocerApp' },
  { years: '2021 - 2022', role: 'Application Consultant', org: 'Techlogix' },
  { years: '2020 - 2021', role: 'Teaching Assistant', org: 'FAST-NUCES' },
];

export const heroMetrics = [
  { value: '82.7%', label: 'answer quality · thesis RAG' },
  { value: '38.5M', label: 'observations · arXiv dataset' },
  { value: '4 yrs', label: 'industry before the MSc' },
];

/* The breadth strip: what he works on overall, from the master CV skills
   and experience sections. */
export const capabilities = [
  {
    title: 'Machine learning',
    items: ['Deep learning · PyTorch, TensorFlow', 'Machine vision', 'Multi-modal data fusion', 'Statistical analysis'],
  },
  {
    title: 'Language systems',
    items: ['NLP and text mining', 'Retrieval-augmented generation', 'LLM-as-judge evaluation', 'Semantic and hybrid search'],
  },
  {
    title: 'Data and delivery',
    items: ['Spark and SQL pipelines', 'Python, R, C++', 'Technical project management', 'Cross-functional teams'],
  },
];

export const selectedWork = [
  {
    meta: ['MSC THESIS', 'Valamis Group / Univ. of Oulu', '2025 - 2026'],
    title: 'Context-Aware Insight Generation via RAG',
    desc: 'A RAG assistant that turns corporate learning data into business insights. Hybrid retrieval (column mapping, intent detection, dense search) with two LLM judges validated against human ratings.',
    metrics: '82.7% answer quality · +13.6 pts over baseline · MRR 0.96 · P@1 0.93',
    links: [{ label: 'Thesis, open access', href: 'https://oulurepo.oulu.fi/handle/10024/63278' }],
  },
  {
    meta: ['ARXIV PREPRINT', 'cs.LG · CC BY 4.0', '2026'],
    title: 'Railway Delays and Finnish Weather',
    desc: 'First publicly available dataset linking Finnish railway operations with synchronized weather, 2018-2024: about 38.5 million observations across 5,915 km of rail and 209 weather stations.',
    metrics: '38.5M observations · XGBoost baseline · 2.73 min MAE',
    links: [{ label: 'arXiv', href: 'https://arxiv.org/abs/2601.16592' }],
  },
  {
    meta: ['TEAM PROJECT · GROWTHHACK 2026', 'Univ. of Oulu Botanical Garden', '2026'],
    title: 'BloomOulu: A Living Garden, Digitised',
    desc: 'A multilingual (English, Finnish, Swedish) platform for the University of Oulu Botanical Garden: plant adoption, QR-linked plant pages, an interactive map, and an AI chat guide that answers from the garden\'s own data and shows its sources. Built and deployed the React front end and the chat guide, with Team Meraki.',
    metrics: 'EN · FI · SV · WCAG 2.2 AA target',
    links: [
      { label: 'Live demo', href: 'https://bloom-oulu.vercel.app/demo-design/' },
      { label: 'Team repo', href: 'https://github.com/hsn07pk/BloomOulu' },
    ],
  },
  {
    meta: ['DEEP LEARNING COURSE', 'University of Oulu', '2024'],
    title: 'Reading Retinas with Deep Learning',
    desc: 'A deep learning model for detecting diabetic retinopathy from retinal images, comparing neural network architectures and optimization techniques: computer vision applied to healthcare diagnostics.',
    metrics: 'Grad-CAM · attention mechanisms · ensembles',
    links: [{ label: 'GitHub', href: 'https://github.com/usamarq/deep_learning_approach_to_detect_diabetic_retinopathy' }],
  },
];

export const toys = [
  {
    id: 'optimizer',
    title: 'Optimizer race',
    desc: 'Drop a marker on a loss surface and watch SGD, momentum and Adam find their way down.',
    tag: 'Live',
    href: '/playground#optimizer-race',
  },
  {
    id: 'digits',
    title: 'Digit sketchpad',
    desc: 'Draw a digit; a small network guesses it, running entirely in your browser.',
    tag: 'Live',
    href: '/playground#digit-sketchpad',
  },
  {
    id: 'circle',
    title: 'Perfect circle',
    desc: 'Draw a circle in one stroke; a least-squares fit scores how round it was.',
    tag: 'Live',
    href: '/playground#perfect-circle',
  },
  {
    id: 'flow',
    title: 'Flow field',
    desc: 'A thousand particles trace a hidden noise field. Your cursor stirs it.',
    tag: 'Live',
    href: '/playground#flow-field',
  },
];

/* ------------------------------------------------------------------ */
/* Full CV data for /cv. Bullets verbatim from the master CV.          */
/* Phone and street address are never published.                       */

export const cvSummary =
  "AI Research Engineer with an M.Sc. in Computer Science & Engineering (AI specialization) from the University of Oulu, completed July 2026, and four years of prior industry experience across software development, application consulting, and technical project management. Hands-on in designing and evaluating machine-learning and AI systems in Python and PyTorch, spanning deep learning, NLP and retrieval-augmented generation, machine vision, and data analytics; built and delivered a retrieval-augmented LLM assistant for Valamis's corporate-learning platform as a Master's thesis. Combines this with project-management experience leading cross-functional teams and translating business requirements into technical solutions. Seeking roles in AI/ML engineering, data science, or research.";

export const cvEducation = [
  {
    degree: 'Master of Science (M.Sc.) in Computer Science & Engineering',
    school: 'University of Oulu, Finland',
    dates: 'Sep 2024 - Jul 2026',
    notes: [
      'Artificial Intelligence specialization track, with a focus on machine vision, deep learning, natural language processing, and LLMs.',
      'Grade: average 4.58 on a 0 to 5 scale, 125 credits completed of 120 required. Thesis assessment: 5.',
      'Thesis: Enhancing Context-Aware Insight Generation in Corporate Learning Platforms via Retrieval-Augmented Language Models.',
      'Relevant coursework: Affective Computing, Machine Vision, Deep Learning, Multi-Modal Data Fusion, Biosignal Processing I, NLP & Text Mining, Introduction to Optimization.',
    ],
    link: { label: 'Thesis, open access', href: 'https://oulurepo.oulu.fi/handle/10024/63278' },
  },
  {
    degree: 'Bachelor of Science (B.Sc.) in Electrical Engineering',
    school: 'National University of Computer & Emerging Sciences (FAST-NUCES), Pakistan',
    dates: 'Aug 2017 - Aug 2021',
    notes: [
      'Specialized in Computer Engineering, with a focus on machine learning, data structures, algorithms, and embedded systems.',
      'Grade: CGPA 3.28 on a 4.00 scale. Degree completed, 137/137 credits.',
      'Relevant coursework: Data Structures and Algorithms, Applied Machine Learning, Fundamentals of Database Systems, Embedded Systems, Multivariable Calculus.',
    ],
  },
];

export const cvRoles = [
  {
    role: "AI Research Engineer (Master's Thesis)",
    org: 'Valamis Group Oy, Finland',
    dates: 'Dec 2025 - Jul 2026',
    bullets: [
      "Built and evaluated a context-aware AI assistant for Valamis's LMS platform, using Retrieval-Augmented Generation (RAG) to ground an LLM in domain knowledge for automated reporting and business-intelligence queries over corporate learning and engagement data.",
      'Designed a hybrid retrieval pipeline (deterministic column mapping, intent detection, and dense semantic search over a 37-document knowledge base) with two LLM-as-judge evaluators validated against human ratings, raising answer quality to 82.7% (a +13.6-point gain over the manual baseline) and the hardest business-strategy questions from 34.7% to 76.7%; retrieval reached MRR 0.96 and Precision@1 0.93.',
      "Delivered the validated system to Valamis's development environment, working across AI, product, and platform teams to align outcomes with the product roadmap.",
    ],
  },
  {
    role: 'AI Research Intern',
    org: 'Centre for Wireless Communications (CWC), University of Oulu, Finland',
    dates: 'Jun 2025 - Jul 2025',
    bullets: [
      'Conducted research on the project "Artificial Intelligence for Predictive Modelling of Weather-Induced Delays in Finland\'s Railway System" under the supervision of Vinicius Pozzobon Borin, PhD, and Dr. Nurul Huda Mahmood.',
      'Developed machine learning models using Python to predict railway delays based on meteorological data, aimed at enhancing operational efficiency.',
    ],
  },
  {
    role: 'Technical Project Manager',
    org: 'ZeePalm, LLC, Lahore, Pakistan',
    dates: 'Oct 2023 - Nov 2024',
    bullets: [
      'Oversaw project lifecycles, defined deliverables, and managed milestones to ensure timely execution.',
      'Provided strategic technical direction on Machine Learning, algorithms, and web-based application development.',
      'Conducted in-depth research and analysis to support project goals and optimize outcomes.',
    ],
  },
  {
    role: 'Software Developer',
    org: 'GrocerApp, Pakistan',
    dates: 'Apr 2022 - Aug 2022',
    bullets: [
      'Enhanced an internal web portal by optimizing Eloquent queries and migrating front-end components from Blade to VueJS.',
      'Improved user experience by integrating multiple payment gateways and developing the Family Cart feature, driving sales and user engagement.',
      'Integrated CleverTap for advanced product analytics and data-driven decision-making.',
    ],
  },
  {
    role: 'Application Consultant',
    org: 'Techlogix (PVT) Ltd, Pakistan',
    dates: 'Aug 2021 - Apr 2022',
    bullets: [
      'Contributed to the design and deployment of a Digital Lending Platform for leading banks across Pakistan.',
      'Developed customized MIS reports using SQL to meet diverse business requirements.',
      'Acted as a bridge between development and product teams by analyzing business requirements and ensuring accurate technical implementation.',
    ],
  },
  {
    role: 'Teacher Assistant',
    org: 'FAST-NUCES, Pakistan',
    dates: 'Aug 2020 - Jan 2021',
    bullets: [
      'Assisted in teaching the Introduction to Computing course for undergraduate students.',
      'Designed and evaluated quizzes, assignments, and programming tasks to assess student understanding.',
      'Provided academic support during lab sessions and addressed student queries to enhance learning outcomes.',
    ],
  },
];

export const cvSkills = [
  { title: 'Programming & Scripting', items: 'Python, SQL, R, C, C++' },
  { title: 'Frameworks & Libraries', items: 'PyTorch, TensorFlow, Scikit-learn, Spark, OpenCV, scikit-image' },
  {
    title: 'Data Science & Machine Learning',
    items:
      'Machine Learning, Deep Learning, Machine Vision, Data Preprocessing & Pipeline Design, Statistical Analysis, Multi-Modal Data Fusion, Natural Language Processing, Large Language Models',
  },
  { title: 'Data Tools & Visualization', items: 'Tableau, Matplotlib, Seaborn, Pandas, NumPy' },
  { title: 'Databases', items: 'Relational Databases (MySQL, PostgreSQL, MS SQL), NoSQL (MongoDB)' },
  { title: 'Tools & Platforms', items: 'Git, Docker, Linux, Firebase' },
  {
    title: 'AI-Assisted Development',
    items:
      'Claude and Claude Code used hands-on as part of everyday development work, including building custom agent skills, hooks, and repeatable workflows rather than one-off prompting',
  },
];

export const cvSoftSkills = [
  'Independent Research & Self-Directed Learning',
  'Project Management & Coordination',
  'Team Leadership & Cross-Functional Collaboration',
];

export const cvLanguages = [
  { lang: 'Finnish', level: 'A2.1 Intermediate, 15 ECTS completed at the University of Oulu' },
  { lang: 'English', level: 'Proficient, C2 / IELTS 8.0' },
  { lang: 'Urdu', level: 'Native' },
];

export const cvCertifications = [
  {
    title: 'Google Data Analytics Professional Certificate',
    org: 'Coursera | Google',
    date: 'Jan 2024',
    note: 'Credential ID: UYM7GF2Y8KA3',
  },
  {
    title: 'International English Language Testing System (IELTS)',
    org: 'Overall Band Score 8.0',
    date: 'Sep 2022',
  },
  {
    title: 'The Data Science Course 2021: Complete Data Science Bootcamp',
    org: 'Udemy',
    date: 'Dec 2021',
    href: 'https://www.udemy.com/certificate/UC-fc12ec77-cd7c-4947-b7f2-5de4b2c7e690/',
  },
];

export const cvHonors = [
  { title: "Dean's Honor List", org: 'FAST-NUCES', date: 'Fall 2020' },
  { title: 'Gold Medal', org: 'FAST-NUCES', date: 'Fall 2017' },
];

export const cvVolunteering = [
  { title: 'Volunteer, Techstars Startup Weekend Oulu', org: 'StartupOulu', date: 'Apr 2026' },
  { title: 'Volunteer, ECSA2026 Conference', org: 'European Citizen Science Association', date: 'Mar 2026' },
  { title: 'Volunteer, Polar Bear Pitching 2026', org: 'BusinessOulu', date: 'Feb 2026' },
  { title: 'Event Assistant, AIS25 Conference', org: 'University of Oulu', date: 'Jun 2025' },
];

export const cvPublication = {
  title: 'Integrating Meteorological and Operational Data: A Novel Approach to Understanding Railway Delays in Finland',
  venue: 'arXiv preprint (cs.LG), CC BY 4.0',
  date: 'Jan 2026',
  bullets: [
    'Co-authored a preprint introducing the first publicly available dataset linking Finnish railway operations with synchronized meteorological data, 2018 to 2024: approximately 38.5 million observations across the 5,915 km rail network and 209 weather stations.',
    "Established a baseline XGBoost model reaching 2.73-minute mean absolute error for station-level delay prediction, demonstrating the dataset's value for machine-learning applications in railway operations.",
  ],
  href: 'https://arxiv.org/abs/2601.16592',
};

export const cvInterests = [
  'Artificial General Intelligence',
  'Quantum Computing',
  'Multimodal AI',
  'Reddit',
  'Competitive E-Sports',
];
