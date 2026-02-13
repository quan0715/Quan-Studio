import type { ResumeSection } from "@/presentation/types/resume";

export type { ResumeGroup, ResumeItem, ResumeSection } from "@/presentation/types/resume";

export const resumeSections: ResumeSection[] = [
  {
    id: "about",
    title: "About",
    tags: [
      "Student",
      "Front-End Developer",
      "UI/UX Designer",
      "Flutter",
      "Notion",
      "Figma",
    ],
    groups: [
      {
        id: "profile",
        title: "Profile",
        items: [
          {
            id: "intro",
            title: "Hey, I'm Quan",
            highlightWord: "Quan",
            subtitle: "Designer & Developer",
            summary:
              "I'm passionate about product design, project management, cross-platform web development, and product UI/UX design. I enjoy turning creative ideas into reality. If you're interested in taking on challenges and collaborating together, please feel free to contact me anytime.",
          },
        ],
      },
      {
        id: "education",
        title: "Education",
        items: [
          {
            id: "ncu-bachelor",
            title: "Department of Computer Science & Information Engineering, National Central University",
            period: "Sep 2020 - Jul 2024",
            subtitle: "Bachelor's degree",
          },
          {
            id: "nycu-master",
            title: "Department of Computer Science & Information Engineering, National Yang Ming Chiao Tung University",
            period: "Next",
            subtitle: "Master's degree",
          },
        ],
      },
      {
        id: "skills",
        title: "Skills",
        items: [
          {
            id: "programming-languages",
            title: "Programming Language",
            summary: "C/C++, Python, Dart, Java",
          },
          {
            id: "technologies-stack",
            title: "Technologies Stack",
            summary: "Flutter, Flask, Django, SQL, Git, Firebase",
          },
          {
            id: "design-pm",
            title: "Design & Project Management",
            summary: "Figma, FigJam, Notion workspace, UI/UX Design",
          },
        ],
      },
    ],
  },
  {
    id: "work-experience",
    title: "Work Experience",
    tags: ["Teaching Assistant", "Consultant", "Intern", "Programming Tutor"],
    groups: [
      {
        id: "ibm",
        title: "IBM",
        items: [
          {
            id: "ibm-intern",
            title: "Associate Application Consultant Intern at International Business Machines Corporation, Taiwan",
            period: "2023/6 - Present",
            summary:
              "Summer intern at IBM, responsible for designing and developing ESG-related monitoring platform applications based on customer requirements.",
          },
        ],
      },
      {
        id: "ncu",
        title: "NCU - National Central University",
        items: [
          {
            id: "ncu-ai-ta",
            title: "Teaching Assistant for Special Topic for interdisciplinary artificial intelligence",
            period: "2023/2 - 2023/6",
            summary:
              "General Education Course Teaching Assistant, providing students without programming skills technical consulting for conducting research projects.",
          },
          {
            id: "ncu-aicup-intern",
            title: "Intern at the AICUP (Artificial Intelligence Competition) Project Office",
            period: "2022/9 - 2023/6",
            summary:
              "Project manager responsible for organizing and promoting competitions among universities.",
          },
          {
            id: "ncu-service-learning-ta",
            title: "Teaching Assistant for Informatics and Service Learning Course",
            period: "2022/9 - 2023/6",
            summary:
              "Teaching students how to organize programming education camps for high school kids.",
          },
          {
            id: "ncu-english-ta",
            title: "Teaching Assistant for Freshman English",
            period: "2022/9 - 2023/6",
            summary:
              "English teaching assistant helping freshman students to enhance their English proficiency.",
          },
        ],
      },
      {
        id: "ai4kid",
        title: "Ai4Kid",
        items: [
          {
            id: "ai4kid-tutor",
            title: "Ai4kid online/in-person python tutor",
            period: "2021/10 - 2022/6",
            summary:
              "Programming instructor at Ai4kid, teaching Python programming language to middle and elementary school students.",
          },
        ],
      },
    ],
  },
];
