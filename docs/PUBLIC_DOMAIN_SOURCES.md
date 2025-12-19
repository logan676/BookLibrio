# Public Domain Book Sources for BookLibrio

> **Document Version:** 1.0
> **Last Updated:** December 2025
> **Purpose:** Catalog of public domain book sources available for integration

---

## Executive Summary

Public domain books are works whose copyright has expired or was never established. These books can be freely distributed, modified, and used commercially without licensing fees. This document catalogs major sources of public domain ebooks that can be integrated into BookLibrio.

**Total Estimated Available Books:** 5,000,000+

---

## 1. Primary Sources (Recommended)

### 1.1 Project Gutenberg

| Attribute | Details |
|-----------|---------|
| **URL** | https://www.gutenberg.org |
| **Books Available** | ~70,000 |
| **Languages** | 60+ languages (primarily English) |
| **Formats** | EPUB, Kindle, HTML, Plain Text |
| **API** | Gutendex API (https://gutendex.com) |
| **License** | Public Domain (varies by country) |
| **Quality** | High (volunteer-proofread) |
| **Update Frequency** | Daily |

**Pros:**
- Largest collection of proofread public domain ebooks
- Well-structured API (Gutendex)
- Multiple download formats
- Active community maintenance

**Cons:**
- Primarily older works (pre-1928 for US)
- Variable formatting quality
- Limited metadata

**Integration Notes:**
- Already implemented: `import-gutenberg.ts`
- Use Gutendex JSON API for metadata
- Download EPUB directly from mirrors

---

### 1.2 Standard Ebooks

| Attribute | Details |
|-----------|---------|
| **URL** | https://standardebooks.org |
| **Books Available** | ~800 |
| **Languages** | English only |
| **Formats** | EPUB, Kindle (AZWZ), EPUB3 |
| **API** | OPDS Feed, RSS |
| **License** | Public Domain (CC0) |
| **Quality** | Premium (professional formatting) |

**Pros:**
- Highest quality formatting and typography
- Modern EPUB3 with semantic markup
- Professionally designed covers
- Consistent metadata
- Enhanced accessibility features

**Cons:**
- Smaller collection
- English only
- Slower growth rate

**Integration Priority:** HIGH - Perfect for "premium" free content

**API Endpoint:**
```
https://standardebooks.org/opds
https://standardebooks.org/ebooks?format=atom
```

---

### 1.3 Internet Archive (Open Library)

| Attribute | Details |
|-----------|---------|
| **URL** | https://archive.org / https://openlibrary.org |
| **Books Available** | 20,000,000+ (scanned), 2,000,000+ downloadable |
| **Languages** | 400+ languages |
| **Formats** | PDF, EPUB, DJVU, Plain Text |
| **API** | Open Library API, Internet Archive API |
| **License** | Public Domain + Controlled Digital Lending |
| **Quality** | Variable (scanned books) |

**Pros:**
- Massive collection
- Historical and rare books
- Multiple languages
- Comprehensive metadata
- Active scanning projects

**Cons:**
- Variable quality (OCR issues)
- Some books require "borrowing"
- Large file sizes
- Complex API

**API Endpoints:**
```
# Search
https://openlibrary.org/search.json?q=title

# Book details
https://openlibrary.org/api/books?bibkeys=ISBN:0451526538&format=json

# Archive.org search
https://archive.org/advancedsearch.php?q=mediatype:texts
```

---

### 1.4 Feedbooks Public Domain

| Attribute | Details |
|-----------|---------|
| **URL** | https://www.feedbooks.com/publicdomain |
| **Books Available** | ~10,000 |
| **Languages** | 10+ languages |
| **Formats** | EPUB, Kindle, PDF |
| **API** | OPDS Catalog |
| **License** | Public Domain |
| **Quality** | Good (formatted for e-readers) |

**Pros:**
- Well-formatted EPUBs
- Organized by category
- OPDS compatible
- Good cover images

**Cons:**
- Smaller collection
- Less frequent updates

**OPDS Feed:**
```
https://www.feedbooks.com/publicdomain/catalog.atom
```

---

## 2. Secondary Sources

### 2.1 ManyBooks

| Attribute | Details |
|-----------|---------|
| **URL** | https://manybooks.net |
| **Books Available** | ~50,000 |
| **Languages** | Multiple |
| **Formats** | EPUB, Kindle, PDF, RTF |
| **License** | Public Domain |

**Notes:** Based on Gutenberg, with additional formatting options.

---

### 2.2 Faded Page (Canada)

| Attribute | Details |
|-----------|---------|
| **URL** | https://www.fadedpage.com |
| **Books Available** | ~10,000 |
| **Languages** | English, French |
| **Formats** | EPUB, Kindle, HTML |
| **License** | Public Domain (Canada) |

**Notes:** Canadian copyright law differs - includes works by authors who died before 1974.

---

### 2.3 Adelaide University Library

| Attribute | Details |
|-----------|---------|
| **URL** | https://ebooks.adelaide.edu.au |
| **Books Available** | ~1,200 |
| **Languages** | English |
| **Formats** | HTML, EPUB |
| **License** | Public Domain (Australia) |

**Notes:** Australian copyright, high-quality transcriptions.

---

### 2.4 Wikisource

| Attribute | Details |
|-----------|---------|
| **URL** | https://wikisource.org |
| **Books Available** | 500,000+ pages |
| **Languages** | 70+ languages |
| **Formats** | HTML, PDF, EPUB (via tools) |
| **License** | Public Domain |

**Notes:** Community-transcribed texts, excellent for multilingual content.

---

## 3. Specialized Collections

### 3.1 LibriVox (Audiobooks)

| Attribute | Details |
|-----------|---------|
| **URL** | https://librivox.org |
| **Books Available** | ~18,000 audiobooks |
| **Languages** | 40+ languages |
| **Formats** | MP3, OGG |
| **License** | Public Domain |

**Integration:** Can be paired with ebook versions for audio support.

**API:**
```
https://librivox.org/api/feed/audiobooks
```

---

### 3.2 HathiTrust Digital Library

| Attribute | Details |
|-----------|---------|
| **URL** | https://www.hathitrust.org |
| **Books Available** | 17,000,000+ volumes |
| **Languages** | Multiple |
| **Formats** | PDF (full), limited EPUB |
| **License** | Public Domain + Restricted |

**Notes:** Academic focus, partnership with universities.

---

### 3.3 Google Books (Public Domain)

| Attribute | Details |
|-----------|---------|
| **URL** | https://books.google.com |
| **Books Available** | 10,000,000+ public domain |
| **Formats** | PDF, EPUB |
| **API** | Google Books API |

**Notes:** Requires filtering for public domain only.

---

## 4. Language-Specific Sources

### 4.1 Chinese Public Domain

| Source | URL | Books | Notes |
|--------|-----|-------|-------|
| Wikisource Chinese | zh.wikisource.org | 100,000+ | Classical Chinese literature |
| Gutenberg Chinese | gutenberg.org | ~500 | Limited selection |
| Chinese Text Project | ctext.org | 30,000+ | Pre-modern Chinese texts |

### 4.2 French

| Source | URL | Books |
|--------|-----|-------|
| Gallica (BnF) | gallica.bnf.fr | 8,000,000+ |
| Ebooks Gratuits | ebooksgratuits.com | 3,000+ |
| Feedbooks FR | feedbooks.com | 5,000+ |

### 4.3 German

| Source | URL | Books |
|--------|-----|-------|
| Projekt Gutenberg-DE | gutenberg.spiegel.de | 10,000+ |
| Zeno.org | zeno.org | 20,000+ |

### 4.4 Spanish

| Source | URL | Books |
|--------|-----|-------|
| Biblioteca Virtual Cervantes | cervantesvirtual.com | 200,000+ |

---

## 5. Implementation Priority Matrix

| Priority | Source | Books | Effort | Value |
|----------|--------|-------|--------|-------|
| **P0** | Project Gutenberg | 70,000 | Low | High |
| **P0** | Standard Ebooks | 800 | Low | Very High |
| **P1** | Internet Archive | 2M+ | Medium | Very High |
| **P1** | Feedbooks | 10,000 | Low | Medium |
| **P2** | LibriVox (Audio) | 18,000 | Medium | High |
| **P2** | Open Library | 2M+ | High | High |
| **P3** | ManyBooks | 50,000 | Low | Low |
| **P3** | Language-specific | Varies | High | Medium |

---

## 6. Copyright Considerations

### 6.1 US Copyright Rules

| Publication Date | Copyright Status |
|-----------------|------------------|
| Before 1928 | Public Domain |
| 1928-1977 | Complex (check registration) |
| After 1977 | Life + 70 years |

### 6.2 International Variations

| Country | Rule |
|---------|------|
| **Australia** | Life + 70 years; pre-1955 publications |
| **Canada** | Life + 70 years (changed 2022) |
| **EU** | Life + 70 years |
| **UK** | Life + 70 years |

### 6.3 Safe Harbor Strategy

For BookLibrio targeting Australian market:
1. **Primary:** Use works clearly in public domain worldwide (pre-1928)
2. **Secondary:** Australian-specific public domain
3. **Verify:** Check copyright status before adding newer works

---

## 7. Technical Integration Specifications

### 7.1 OPDS (Open Publication Distribution System)

OPDS is a standard catalog format for ebook distribution.

**Compatible Sources:**
- Standard Ebooks
- Feedbooks
- ManyBooks
- Internet Archive

**Implementation:**
```typescript
// OPDS feed parsing
const response = await fetch('https://standardebooks.org/opds')
const xml = await response.text()
const catalog = parseOPDS(xml)
```

### 7.2 Bulk Download Strategy

For large-scale imports:

```bash
# Gutenberg bulk download
wget -m -np https://www.gutenberg.org/robot/harvest

# Standard Ebooks bulk
git clone https://github.com/standardebooks/ebooks
```

### 7.3 Recommended Import Workflow

```
1. Fetch catalog/metadata → Store in staging table
2. Filter by language, copyright status
3. Download EPUBs → Upload to R2
4. Extract metadata (title, author, cover)
5. Create ebook records
6. Link to categories
7. Enrich with external metadata (Goodreads, Google Books)
```

---

## 8. Estimated Storage & Costs

### 8.1 Storage Estimates

| Source | Books | Avg Size | Total Storage |
|--------|-------|----------|---------------|
| Gutenberg (all) | 70,000 | 500 KB | ~35 GB |
| Standard Ebooks | 800 | 2 MB | ~1.6 GB |
| Internet Archive (selection) | 100,000 | 5 MB | ~500 GB |
| **Total (Conservative)** | **170,800** | - | **~540 GB** |

### 8.2 Cloudflare R2 Cost Estimate

| Tier | Storage | Egress | Monthly Cost |
|------|---------|--------|--------------|
| Free Tier | 10 GB | 10 GB | $0 |
| 100 GB | 100 GB | 100 GB | ~$1.50 |
| 500 GB | 500 GB | 500 GB | ~$7.50 |
| 1 TB | 1 TB | 1 TB | ~$15.00 |

---

## 9. Quick Start Commands

### Import Gutenberg (Already Implemented)

```bash
cd /Users/HONGBGU/Documents/booklibrio/packages/api

# Run migration first
npx tsx src/scripts/migrate-add-external-source.ts

# Test with 10 books
npx tsx src/scripts/import-gutenberg.ts --limit=10 --dry-run

# Import 1000 English books
npx tsx src/scripts/import-gutenberg.ts --limit=1000 --language=en --skip-existing
```

### Import Standard Ebooks (To Be Implemented)

```bash
npx tsx src/scripts/import-standard-ebooks.ts --dry-run
```

---

## 10. Recommended Import Schedule

| Phase | Source | Books | Timeline |
|-------|--------|-------|----------|
| Phase 1 | Standard Ebooks | 800 | Week 1 |
| Phase 2 | Gutenberg (Top 10K) | 10,000 | Week 1-2 |
| Phase 3 | Gutenberg (All) | 70,000 | Week 2-4 |
| Phase 4 | Feedbooks | 10,000 | Week 4 |
| Phase 5 | Internet Archive (Selection) | 50,000 | Week 4-8 |

---

## Appendix: API Quick Reference

### Gutendex API

```bash
# List books
curl "https://gutendex.com/books/?page=1&languages=en"

# Search
curl "https://gutendex.com/books/?search=dickens"

# Filter by topic
curl "https://gutendex.com/books/?topic=fiction"
```

### Open Library API

```bash
# Search
curl "https://openlibrary.org/search.json?q=war+and+peace"

# Get book by ISBN
curl "https://openlibrary.org/api/books?bibkeys=ISBN:0451526538&format=json"
```

### Internet Archive API

```bash
# Search public domain texts
curl "https://archive.org/advancedsearch.php?q=mediatype:texts+AND+licenseurl:*publicdomain*&output=json"
```

---

*Document End*
