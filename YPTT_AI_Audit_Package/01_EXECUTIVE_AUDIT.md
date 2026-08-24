# FULL WORKBOOK DISSECTION — YPTT TI TRACKER

Source: `YPTT_TI Tracker_Tsel Project_ 19 Agustus 2026.xlsx`  
Workbook size: 4,796,177 bytes  
Worksheets: 22  
Formula cells: 4,615  
Raw/cell error cells: 466  
Formula cells with cached error results: 72  
Formula cells containing external workbook references: 60  
Pivot table definitions: 54  
Calculation-chain entries: 4,615

## Executive finding
The workbook is a **hybrid operational tracker + reporting system**, not a simple flat spreadsheet. The critical architecture is:

`Operational trackers → Pivot/summary layers → Dashboards`

with additional lookup/validation/master-data sheets and **external workbook dependencies**.

## Critical risks before web implementation
1. **External dependencies:** several formulas in `Site_KAL` and `Site_SUL` reference external workbooks that are not included in this upload. A web application cannot reproduce these values reliably unless those sources are imported or replaced by a data pipeline.
2. **Broken dashboard formulas:** `Dashboard SUL` contains 71 formula cells whose cached result is `#REF!` (including `GETPIVOTDATA` calls and downstream calculations).
3. **Formula error:** `Site_KAL` contains a formula error at `AC23` with cached `#VALUE!`.
4. **Raw error values:** there are raw error cells in `Site_KAL`, `Site_SUL`, `Pivot Kal`, `Pivot Sul`, and `Summary Sul`.
5. **Pivot dependence:** dashboards depend on pivot layouts and field captions. Rebuilding the system on the web should use normalized aggregations rather than emulate Excel PivotTable internals.
6. **Date serials:** many operational dates are stored as Excel serial numbers; the web model must normalize them to ISO dates while preserving the original serial/value for lineage.
7. **Sensitive master data:** `Team List` contains contact details and identification numbers. Do not expose this sheet wholesale to a public-facing AI or client-side application.

## Sheet roles
- `Dashboard_2026`: executive dashboard; uses `Pivot Sul` and `Pivot Kal`.
- `Dashboard SUL`: monthly Sulawesi milestone dashboard; currently has broken cached formulas.
- `Dashboard Sulawesi`: Sulawesi dashboard; uses `Pvt Dash Sul`.
- `Site_KAL`: Kalimantan operational tracker; 603 formulas and external lookups.
- `Site_SUL`: Sulawesi operational tracker; 3,377 formulas and external lookups.
- `Pvt Dash Sul`: pivot-derived dashboard data.
- `Pvt Productivity TI`: productivity/PO-derived pivot output with formula logic.
- `Pivot Kal`, `Pivot Sul`: aggregation/reporting layers.
- `Summary Kal`, `Summary Sul`: summary tables.
- `Inbound`, `Inbound Return`: material/logistics tracking.
- `LOM`: material/LOM reference data.
- `Team List`: team/person master data; sensitive fields present.
- `Ineom`: small reference table.
- `Chart team`: chart/presentation layer.
- `Validasi`, `Validasi2`: controlled vocabularies/status dictionaries.
- `Sheet1`, `Sheet2`, `Site_Upgrade PLN`: auxiliary/input/reporting sheets.

## Main operational keys
- `WID` is the strongest cross-sheet business identifier in the tracker ecosystem.
- Site identifiers such as `Site ID` / `Site ID Impl` and `NE ID` are important secondary keys.
- Region/zone fields (`ZTE ZONE`, branch, cluster, RTPO/kabupaten) support geographic reporting.

## Recommended web architecture
**Raw ingestion layer** → preserve source rows exactly.  
**Canonical data layer** → normalize WID/site/date/status fields.  
**Business-rule layer** → translate approved formulas.  
**Aggregation layer** → reproduce Pivot metrics with SQL/query logic.  
**API layer** → expose validated metrics and row-level records.  
**AI layer** → answer only from API/tool results plus the AI system prompt.

Do not make the AI parse the raw XLSX on every question.

## Deliverables in this package
- `02_SHEET_DICTIONARY.csv` — sheet dimensions, formulas, errors, headers.
- `03_DEPENDENCY_MAP.csv` / `.json` — inter-sheet formula dependency graph.
- `04_FORMULA_CATALOG.csv` — every formula cell with cached result and dependency information.
- `05_ERROR_CATALOG.csv` — formula/raw error inventory.
- `06_EXTERNAL_LINKS.csv` — external workbook dependencies.
- `07_PIVOT_CATALOG.csv` — PivotTable definitions.
- `08_DEFINED_NAMES.csv` — workbook defined names.
- `08_AI_SYSTEM_PROMPT.md` — ready-to-use AI system instruction.
- `09_AI_READY_SCHEMA.json` — proposed canonical web data model.

## Bottom line
The workbook can be migrated to a web application, but **it should be migrated as a data model and calculation specification, not as a literal Excel clone**. The biggest blockers are the external workbooks and the broken `Dashboard SUL` formulas.
