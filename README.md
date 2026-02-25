# Image Classifier – Animal & Breed Classification

Web aplikacija za **klasifikaciju životinja i njihovih pasmina** na temelju slika, koristeći **Azure Machine Learning endpoint** na kojem je deployan lokalno istrenirani model.

Aplikacija omogućuje upload jedne ili više slika, njihovu obradu putem backend servisa te prikaz:
- rezultata za **svaku pojedinačnu sliku**
- **konačne predikcije** koju životinju i pasminu model prepoznaje

---

<img width="2557" height="1325" alt="image" src="https://github.com/user-attachments/assets/485031c6-43d9-4e7d-95c0-29aa27cda115" />

---

## Online demo

**UI aplikacija:**  
https://lambent-mermaid-6c35b5.netlify.app/

---

## Kako sustav radi

1. **Frontend (React + Vite)**  
   - Jednostavan **drag & drop** upload slika  
   - Moguć upload **više slika odjednom**
   - Slike se šalju backendu na obradu

2. **Backend (Spring Boot)**  
   - Prima slike s frontenda
   - Prosljeđuje ih **Azure ML endpointu**
   - Dodaje autentikaciju (Bearer token)
   - Vraća rezultate frontendu

3. **Azure ML Endpoint**
   - Endpoint s lokalno istreniranim modelom
   - Model klasificira:
     - životinju
     - pasminu životinje

---

## Tehnologije

### Frontend
- React
- Vite
- JavaScript
- Drag & Drop file upload

### Backend
- Java 21
- Spring Boot
- REST API
- Azure ML integration

### ML / Cloud
- Azure Machine Learning
- Custom trained image classification model

---

## Struktura repozitorija

```
ImageClassifier/
│
├── frontend/   # React (Vite) aplikacija
└── backend/    # Spring Boot aplikacija
```

## Pokretanje aplikacije lokalno

### Preduvjeti
- **Node.js** (v18+ preporučeno)
- **Java 21**
- **Maven** (ili Maven Wrapper)
- Bilo koji IDE (IntelliJ IDEA, VS Code, Eclipse…)

---

## Environment variable

### Prije pokretanja potrebno je postaviti sljedeće environment varijable:

```text
AZURE_URL=<your-azure-endpoint-url>
BEARER_TOKEN=<your-bearer-token>
```

