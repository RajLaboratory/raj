// DEMO DATA ONLY. Reference ranges are typical adult values used to exercise the software.
// The laboratory's pathologist must review and approve every range before clinical use.
export type P = {
  c: string; n: string; u?: string; d?: number; type?: "NUMERIC" | "TEXT" | "POS_NEG" | "REACTIVE" | "PRESENT_ABSENT" | "DETECTED";
  lo?: number; hi?: number; crit?: [number | null, number | null];
  m?: [number, number]; f?: [number, number]; text?: string;
};
export type T = { code: string; name: string; dept: string; sample: string; container?: string; price: number; cost: number; tat: number; fasting?: boolean; method?: string; out?: number; params: P[] };

export const DEPARTMENTS = [
  ["HEM", "Hematology"], ["BIO", "Biochemistry"], ["CLP", "Clinical Pathology"], ["IMM", "Immunology"],
  ["SER", "Serology"], ["HOR", "Hormones"], ["END", "Endocrinology"], ["MIC", "Microbiology"],
  ["HIS", "Histopathology"], ["CYT", "Cytology"], ["MOL", "Molecular Diagnostics"], ["VIT", "Vitamin Tests"],
  ["TUM", "Tumor Markers"], ["SPL", "Special Tests"],
] as const;

const one = (code: string, name: string, dept: string, sample: string, price: number, p: P, extra: Partial<T> = {}): T => ({
  code, name, dept, sample, price, cost: Math.round(price * 0.35), tat: 24, params: [p], ...extra,
});
const num = (c: string, n: string, u: string, lo: number, hi: number, d = 1): P => ({ c, n, u, lo, hi, d });

export const TESTS: T[] = [
  { code: "CBC", name: "Complete Blood Count", dept: "HEM", sample: "Whole blood (EDTA)", container: "Lavender", price: 35000, cost: 9000, tat: 4, method: "Impedance / flow cytometry", params: [
    { c: "HB", n: "Haemoglobin", u: "g/dL", d: 1, m: [13, 17], f: [12, 15], crit: [7, 20] },
    { c: "RBC", n: "Total RBC Count", u: "million/µL", d: 2, m: [4.5, 5.5], f: [3.8, 4.8] },
    { c: "HCT", n: "Haematocrit (PCV)", u: "%", d: 1, m: [40, 50], f: [36, 46] },
    { c: "MCV", n: "MCV", u: "fL", d: 1, lo: 83, hi: 101 },
    { c: "MCH", n: "MCH", u: "pg", d: 1, lo: 27, hi: 32 },
    { c: "MCHC", n: "MCHC", u: "g/dL", d: 1, lo: 31.5, hi: 34.5 },
    { c: "RDW", n: "RDW-CV", u: "%", d: 1, lo: 11.6, hi: 14 },
    { c: "WBC", n: "Total WBC Count", u: "/µL", d: 0, lo: 4000, hi: 11000, crit: [2000, 30000] },
    { c: "NEU", n: "Neutrophils", u: "%", d: 0, lo: 40, hi: 80 },
    { c: "LYM", n: "Lymphocytes", u: "%", d: 0, lo: 20, hi: 40 },
    { c: "MON", n: "Monocytes", u: "%", d: 0, lo: 2, hi: 10 },
    { c: "EOS", n: "Eosinophils", u: "%", d: 0, lo: 1, hi: 6 },
    { c: "BAS", n: "Basophils", u: "%", d: 0, lo: 0, hi: 2 },
    { c: "PLT", n: "Platelet Count", u: "/µL", d: 0, lo: 150000, hi: 410000, crit: [20000, 1000000] },
  ] },
  one("ESR", "ESR (Westergren)", "HEM", "Whole blood (EDTA)", 15000, { c: "ESR", n: "ESR", u: "mm/hr", d: 0, m: [0, 15], f: [0, 20] }, { tat: 2 }),
  one("HBA1C", "HbA1c (Glycated Haemoglobin)", "BIO", "Whole blood (EDTA)", 55000, { c: "HBA1C", n: "HbA1c", u: "%", d: 1, lo: 4, hi: 5.6 }, { method: "HPLC", tat: 6 }),
  one("FBS", "Fasting Blood Sugar", "BIO", "Plasma (Fluoride)", 8000, { c: "FBS", n: "Glucose (Fasting)", u: "mg/dL", d: 0, lo: 70, hi: 99, crit: [40, 500] }, { fasting: true, tat: 2 }),
  one("PPBS", "Post-Prandial Blood Sugar", "BIO", "Plasma (Fluoride)", 8000, { c: "PPBS", n: "Glucose (Post-prandial)", u: "mg/dL", d: 0, lo: 70, hi: 139, crit: [40, 500] }, { tat: 2 }),
  one("RBS", "Random Blood Sugar", "BIO", "Plasma (Fluoride)", 8000, { c: "RBS", n: "Glucose (Random)", u: "mg/dL", d: 0, lo: 70, hi: 139, crit: [40, 500] }, { tat: 2 }),
  { code: "LIPID", name: "Lipid Profile", dept: "BIO", sample: "Serum", container: "Gel tube", price: 60000, cost: 16000, tat: 6, fasting: true, params: [
    num("TC", "Total Cholesterol", "mg/dL", 0, 200, 0), num("TG", "Triglycerides", "mg/dL", 0, 150, 0),
    { c: "HDL", n: "HDL Cholesterol", u: "mg/dL", d: 0, lo: 40, hi: 90 },
    num("LDL", "LDL Cholesterol", "mg/dL", 0, 100, 0), num("VLDL", "VLDL Cholesterol", "mg/dL", 5, 40, 0),
    num("TCHDL", "TC / HDL Ratio", "", 0, 5, 1),
  ] },
  { code: "LFT", name: "Liver Function Test", dept: "BIO", sample: "Serum", container: "Gel tube", price: 55000, cost: 15000, tat: 6, params: [
    num("TBIL", "Total Bilirubin", "mg/dL", 0.2, 1.2, 2), num("DBIL", "Direct Bilirubin", "mg/dL", 0, 0.3, 2), num("IBIL", "Indirect Bilirubin", "mg/dL", 0.1, 1, 2),
    num("SGOT", "SGOT (AST)", "U/L", 0, 40, 0), num("SGPT", "SGPT (ALT)", "U/L", 0, 41, 0), num("ALP", "Alkaline Phosphatase", "U/L", 44, 147, 0),
    num("TP", "Total Protein", "g/dL", 6.4, 8.3, 1), num("ALB", "Albumin", "g/dL", 3.5, 5.2, 1), num("GLOB", "Globulin", "g/dL", 2, 3.5, 1), num("AG", "A/G Ratio", "", 1, 2.1, 2),
  ] },
  { code: "KFT", name: "Kidney Function Test", dept: "BIO", sample: "Serum", container: "Gel tube", price: 50000, cost: 13000, tat: 6, params: [
    num("UREA", "Urea", "mg/dL", 15, 45, 0), { c: "BUN", n: "Blood Urea Nitrogen", u: "mg/dL", d: 1, lo: 7, hi: 20 },
    { c: "CREA", n: "Creatinine", u: "mg/dL", d: 2, m: [0.7, 1.3], f: [0.6, 1.1], crit: [null, 10] },
    { c: "UA", n: "Uric Acid", u: "mg/dL", d: 1, m: [3.5, 7.2], f: [2.6, 6] },
    num("CA", "Calcium", "mg/dL", 8.6, 10.2, 1), num("PHOS", "Phosphorus", "mg/dL", 2.5, 4.5, 1),
    { c: "NA", n: "Sodium", u: "mmol/L", d: 0, lo: 135, hi: 145, crit: [120, 160] },
    { c: "K", n: "Potassium", u: "mmol/L", d: 1, lo: 3.5, hi: 5.1, crit: [2.5, 6.5] },
    num("CL", "Chloride", "mmol/L", 98, 107, 0),
  ] },
  { code: "THYROID", name: "Thyroid Profile (T3, T4, TSH)", dept: "END", sample: "Serum", container: "Gel tube", price: 45000, cost: 12000, tat: 6, method: "CLIA", params: [
    num("T3", "Total T3", "ng/dL", 80, 200, 0), num("T4", "Total T4", "µg/dL", 5.1, 14.1, 1), num("TSH", "TSH", "µIU/mL", 0.27, 4.2, 2),
  ] },
  one("T3", "Total T3", "END", "Serum", 25000, num("T3", "Total T3", "ng/dL", 80, 200, 0), { method: "CLIA" }),
  one("T4", "Total T4", "END", "Serum", 25000, num("T4", "Total T4", "µg/dL", 5.1, 14.1, 1), { method: "CLIA" }),
  one("TSH", "TSH", "END", "Serum", 30000, num("TSH", "TSH", "µIU/mL", 0.27, 4.2, 2), { method: "CLIA" }),
  one("FT3", "Free T3", "END", "Serum", 35000, num("FT3", "Free T3", "pg/mL", 2, 4.4, 2), { method: "CLIA" }),
  one("FT4", "Free T4", "END", "Serum", 35000, num("FT4", "Free T4", "ng/dL", 0.93, 1.7, 2), { method: "CLIA" }),
  one("B12", "Vitamin B12", "VIT", "Serum", 80000, num("B12", "Vitamin B12", "pg/mL", 200, 900, 0), { method: "CLIA", tat: 12 }),
  one("VITD", "Vitamin D (25-OH)", "VIT", "Serum", 120000, num("VITD", "25-OH Vitamin D", "ng/mL", 30, 100, 1), { method: "CLIA", tat: 12 }),
  { code: "URINE", name: "Urine Routine & Microscopy", dept: "CLP", sample: "Urine (random)", container: "Sterile container", price: 12000, cost: 3000, tat: 3, params: [
    { c: "COL", n: "Colour", type: "TEXT" }, { c: "APP", n: "Appearance", type: "TEXT" },
    { c: "SG", n: "Specific Gravity", d: 3, lo: 1.005, hi: 1.03 }, num("PH", "pH", "", 4.5, 8, 1),
    { c: "PROT", n: "Protein", type: "POS_NEG", text: "Negative" }, { c: "GLU", n: "Glucose", type: "POS_NEG", text: "Negative" },
    { c: "KET", n: "Ketones", type: "POS_NEG", text: "Negative" }, { c: "BLD", n: "Blood", type: "POS_NEG", text: "Negative" },
    { c: "PUS", n: "Pus Cells", u: "/HPF", type: "TEXT", text: "0-5" }, { c: "EPI", n: "Epithelial Cells", u: "/HPF", type: "TEXT", text: "0-5" },
    { c: "RBCU", n: "RBCs", u: "/HPF", type: "TEXT", text: "Nil" },
  ] },
  one("CRP", "C-Reactive Protein (Quantitative)", "IMM", "Serum", 40000, num("CRP", "CRP", "mg/L", 0, 5, 1), { method: "Immunoturbidimetry", tat: 6 }),
  one("FERR", "Ferritin", "BIO", "Serum", 60000, { c: "FERR", n: "Ferritin", u: "ng/mL", d: 1, m: [30, 400], f: [13, 150] }, { method: "CLIA", tat: 12 }),
  { code: "IRON", name: "Iron Profile", dept: "BIO", sample: "Serum", container: "Gel tube", price: 70000, cost: 20000, tat: 12, params: [
    { c: "FE", n: "Serum Iron", u: "µg/dL", d: 0, m: [65, 175], f: [50, 170] }, num("TIBC", "TIBC", "µg/dL", 250, 450, 0), num("UIBC", "UIBC", "µg/dL", 110, 370, 0), num("TSAT", "Transferrin Saturation", "%", 20, 50, 0),
  ] },
  one("PSA", "PSA Total", "TUM", "Serum", 70000, num("PSA", "Total PSA", "ng/mL", 0, 4, 2), { method: "CLIA" }),
  one("TESTO", "Testosterone (Total)", "HOR", "Serum", 70000, { c: "TESTO", n: "Testosterone", u: "ng/dL", d: 1, m: [249, 836], f: [8, 60] }, { method: "CLIA" }),
  one("LH", "LH", "HOR", "Serum", 55000, { c: "LH", n: "Luteinizing Hormone", u: "mIU/mL", d: 2, m: [1.7, 8.6], f: [2.4, 12.6] }, { method: "CLIA" }),
  one("FSH", "FSH", "HOR", "Serum", 55000, { c: "FSH", n: "Follicle Stimulating Hormone", u: "mIU/mL", d: 2, m: [1.5, 12.4], f: [3.5, 12.5] }, { method: "CLIA" }),
  one("PRL", "Prolactin", "HOR", "Serum", 55000, { c: "PRL", n: "Prolactin", u: "ng/mL", d: 2, m: [4, 15.2], f: [4.8, 23.3] }, { method: "CLIA" }),
  one("E2", "Estradiol (E2)", "HOR", "Serum", 60000, num("E2", "Estradiol", "pg/mL", 10, 40, 1), { method: "CLIA" }),
  one("PROG", "Progesterone", "HOR", "Serum", 60000, num("PROG", "Progesterone", "ng/mL", 0.2, 1.4, 2), { method: "CLIA" }),
  one("CORT", "Cortisol (Morning)", "HOR", "Serum", 55000, num("CORT", "Cortisol", "µg/dL", 6.2, 19.4, 1), { method: "CLIA" }),
  one("AMH", "Anti-Mullerian Hormone", "HOR", "Serum", 180000, num("AMH", "AMH", "ng/mL", 1, 10, 2), { method: "CLIA", tat: 24 }),
  one("INS", "Insulin (Fasting)", "END", "Serum", 60000, num("INS", "Insulin", "µIU/mL", 2.6, 24.9, 1), { fasting: true, method: "CLIA" }),
  one("PTH", "Parathyroid Hormone (Intact)", "END", "Serum", 120000, num("PTH", "Intact PTH", "pg/mL", 15, 65, 1), { method: "CLIA" }),
  { code: "COAG", name: "PT / INR", dept: "HEM", sample: "Citrate plasma", container: "Blue top", price: 45000, cost: 12000, tat: 4, params: [
    num("PT", "Prothrombin Time", "sec", 11, 13.5, 1), num("INR", "INR", "", 0.8, 1.2, 2),
  ] },
  one("APTT", "APTT", "HEM", "Citrate plasma", 45000, num("APTT", "APTT", "sec", 25, 35, 1), { container: "Blue top", tat: 4 }),
  one("RETIC", "Reticulocyte Count", "HEM", "Whole blood (EDTA)", 25000, num("RETIC", "Reticulocytes", "%", 0.5, 2.5, 1)),
  one("BGRP", "Blood Group & Rh Factor", "HEM", "Whole blood (EDTA)", 10000, { c: "BGRP", n: "Blood Group / Rh", type: "TEXT" }, { tat: 2 }),
  one("PS", "Peripheral Smear", "HEM", "Whole blood (EDTA)", 20000, { c: "PS", n: "Peripheral Smear Findings", type: "TEXT" }),
  one("MP", "Malaria Antigen (Rapid)", "SER", "Whole blood (EDTA)", 40000, { c: "MP", n: "Malaria Antigen", type: "POS_NEG", text: "Negative" }, { tat: 2 }),
  one("DENGUE", "Dengue NS1 Antigen", "SER", "Serum", 60000, { c: "NS1", n: "Dengue NS1", type: "POS_NEG", text: "Negative" }, { tat: 4 }),
  one("WIDAL", "Widal Test", "SER", "Serum", 25000, { c: "WIDAL", n: "Widal (Slide)", type: "TEXT" }),
  one("HIV", "HIV I & II Antibodies", "SER", "Serum", 40000, { c: "HIV", n: "HIV I & II", type: "REACTIVE", text: "Non-reactive" }, { tat: 6 }),
  one("HBSAG", "HBsAg", "SER", "Serum", 35000, { c: "HBSAG", n: "HBsAg", type: "REACTIVE", text: "Non-reactive" }, { tat: 6 }),
  one("HCV", "Anti-HCV", "SER", "Serum", 50000, { c: "HCV", n: "Anti-HCV", type: "REACTIVE", text: "Non-reactive" }, { tat: 6 }),
  one("RA", "RA Factor", "IMM", "Serum", 35000, num("RA", "Rheumatoid Factor", "IU/mL", 0, 14, 1)),
  one("ASO", "ASO Titre", "IMM", "Serum", 40000, num("ASO", "ASO", "IU/mL", 0, 200, 0)),
  one("ANA", "ANA (IFA)", "IMM", "Serum", 120000, { c: "ANA", n: "ANA", type: "TEXT", text: "Negative" }, { out: 70000, tat: 72 }),
  one("IGE", "Total IgE", "IMM", "Serum", 80000, num("IGE", "Total IgE", "IU/mL", 0, 100, 1)),
  one("CEA", "CEA", "TUM", "Serum", 90000, num("CEA", "CEA", "ng/mL", 0, 5, 2), { method: "CLIA" }),
  one("CA125", "CA 125", "TUM", "Serum", 130000, num("CA125", "CA 125", "U/mL", 0, 35, 1), { method: "CLIA" }),
  one("AFP", "Alpha Fetoprotein", "TUM", "Serum", 90000, num("AFP", "AFP", "ng/mL", 0, 8.5, 2), { method: "CLIA" }),
  one("CA199", "CA 19-9", "TUM", "Serum", 130000, num("CA199", "CA 19-9", "U/mL", 0, 37, 1), { method: "CLIA" }),
  one("URC", "Urine Culture & Sensitivity", "MIC", "Urine (mid-stream)", 60000, { c: "URC", n: "Culture Result", type: "TEXT" }, { container: "Sterile container", tat: 72 }),
  one("BC", "Blood Culture & Sensitivity", "MIC", "Blood (culture bottle)", 120000, { c: "BC", n: "Culture Result", type: "TEXT" }, { tat: 120 }),
  one("SPC", "Sputum AFB Smear", "MIC", "Sputum", 20000, { c: "AFB", n: "AFB Smear", type: "TEXT" }, { tat: 24 }),
  one("PAP", "Pap Smear", "CYT", "Cervical smear", 60000, { c: "PAP", n: "Cytology Findings", type: "TEXT" }, { tat: 72 }),
  one("FNAC", "FNAC", "CYT", "Aspirate", 100000, { c: "FNAC", n: "Cytology Findings", type: "TEXT" }, { tat: 72 }),
  one("HISTO", "Histopathology (Small Biopsy)", "HIS", "Tissue in formalin", 150000, { c: "HISTO", n: "Histopathology Findings", type: "TEXT" }, { tat: 120 }),
  one("COVID", "SARS-CoV-2 RT-PCR", "MOL", "Nasopharyngeal swab", 80000, { c: "COVID", n: "SARS-CoV-2 RNA", type: "DETECTED", text: "Not detected" }, { out: 50000, tat: 24 }),
  one("HBVDNA", "HBV DNA Quantitative", "MOL", "Serum", 400000, num("HBVDNA", "HBV DNA", "IU/mL", 0, 20, 0), { out: 280000, tat: 72 }),
  one("HLAB27", "HLA-B27 (PCR)", "MOL", "Whole blood (EDTA)", 250000, { c: "HLAB27", n: "HLA-B27", type: "DETECTED", text: "Not detected" }, { out: 160000, tat: 72 }),
  one("HOMO", "Homocysteine", "SPL", "Serum", 130000, num("HOMO", "Homocysteine", "µmol/L", 5, 15, 1), { out: 80000, tat: 48 }),
  one("DDIM", "D-Dimer", "SPL", "Citrate plasma", 90000, num("DDIM", "D-Dimer", "ng/mL FEU", 0, 500, 0), { container: "Blue top", tat: 6 }),
  one("TROP", "Troponin I", "SPL", "Serum", 80000, num("TROP", "Troponin I", "ng/mL", 0, 0.04, 3), { tat: 2 }),
  one("AMYL", "Serum Amylase", "BIO", "Serum", 40000, num("AMYL", "Amylase", "U/L", 28, 100, 0)),
  one("LIPA", "Serum Lipase", "BIO", "Serum", 50000, num("LIPA", "Lipase", "U/L", 13, 60, 0)),
  one("CPK", "CPK-MB", "BIO", "Serum", 60000, num("CPKMB", "CPK-MB", "U/L", 0, 25, 0), { tat: 4 }),
];

export const PACKAGES = [
  { code: "PKG-BASIC", name: "Basic Health Checkup", price: 99900, tests: ["CBC", "FBS", "LIPID", "LFT", "KFT", "URINE"] },
  { code: "PKG-DIAB", name: "Diabetes Profile", price: 89900, tests: ["FBS", "PPBS", "HBA1C", "KFT", "URINE"] },
  { code: "PKG-THY", name: "Thyroid + Vitamin Package", price: 199900, tests: ["THYROID", "B12", "VITD"] },
  { code: "PKG-FEV", name: "Fever Panel", price: 119900, tests: ["CBC", "MP", "DENGUE", "WIDAL", "CRP"] },
];
