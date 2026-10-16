// Shared by the 3D /projects scene and the home terminal's picker.
// Keep order and disabled entries: the 3D scene picks each shape by index in this full list.
export const projects = [
  { id: 1, title: "Arrhythmia Detector", description: "Developed a convolutional Neural Network based on Google's AlexNet deep learning architecture to detect different types of arrhythmia with 94% accuracy." },
  { id: 2, title: "Neuro Scan", description: "Built web application for the NHS to visualise abnormalities in MRI scans & ease physician workload in detecting parameter anomalies.", link: "https://topol.digitalacademy.nhs.uk/digital-fellowships/case-studies/haris-shuaib" },
  { id: 3, title: "Home-Work", description: "Used Google Gemini & GCP to bulid a web application with the aim to find grammatical errors in student homework.", disabled: true },
  { id: 4, title: "Leaf Line", description: "Coded python library for a leading space company to ensure fast, secure, and efficient data transmission between ground stations and satellites in LEO.", link: "https://leaf.space/leaf-line/" },
  { id: 5, title: "Loan Coin", description: "Created blockchain based crowd lending platform to help women in rural areas set up businesses. Invited to pitch to the United Nations." },
  { id: 6, title: "Hotel Price Tracker", description: "Used python scripting to automate the process of checking hotel prices to get the best deals.", disabled: true },
  { id: 7, title: "Assisty", description: "Developed an AI-Powered spam classifier to detect fraudulent text messages and conversations using LLMs." },
]

export const getVisibleProjects = () => projects.filter((project) => !project.disabled)

export const getProjectById = (id) => projects.find((project) => project.id === id)
