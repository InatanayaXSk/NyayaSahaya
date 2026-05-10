# NyayaSahaya IEEE Access Research Paper

## Paper Title
**NyayaSahaya: A Hardware-Integrated Retrieval-Augmented Generation Platform for Democratizing Legal Assistance in India**

## Authors
Name1, Name2, Name3, Name4  
Department of Computer Science and Engineering  
RV College of Engineering, Bengaluru, India

## File Structure
```
r_paper/
├── main.tex                    # Main LaTeX document (entry point)
├── references.bib              # BibTeX references (27 citations)
├── README.md                   # This file
└── sections/
    ├── introduction.tex        # Section I: Introduction
    ├── related_work.tex        # Section II: Related Work
    ├── system_architecture.tex # Section III: System Architecture
    ├── methodology.tex         # Section IV: Methodology
    ├── implementation.tex      # Section V: Implementation Details
    ├── results.tex             # Section VI: Experimental Evaluation
    └── conclusion.tex          # Section VII: Conclusion
```

## How to Compile

### Option 1: Overleaf (Recommended)
1. Upload all files maintaining the directory structure
2. Set `main.tex` as the main document
3. Use the **IEEE Access** template from Overleaf gallery, or simply compile with pdflatex
4. Compile with: pdfLaTeX → BibTeX → pdfLaTeX → pdfLaTeX

### Option 2: Local Compilation
```bash
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

## Notes
- Replace `Name1`, `Name2`, `Name3`, `Name4` with actual author names
- Replace `[Mentor Name]` in main.tex with the actual mentor's name
- The paper uses the standard `IEEEtran` document class
- For full IEEE Access formatting, download `ieeeaccess.cls` from IEEE Author Center
- Diagram placeholders are included - replace with actual figures for submission
