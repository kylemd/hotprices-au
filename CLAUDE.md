# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hot Prices AU is a fork of the German grocery price tracker "heissepreise". It scrapes data from Australian grocery chains (Coles and Woolworths) and provides a web interface for price comparison and history tracking. The project consists of:

- **Backend (Python)**: Web scraping, data processing, and analysis
- **Frontend (JavaScript/Node.js)**: Static web interface adapted from the original heissepreise project

## Commands

### Python Backend
- **Scrape data**: `python main.py sync <store>` where `<store>` is `coles` or `woolies`
- **Quick scrape**: `python main.py sync --quick <store>` (limited data)
- **Process data**: `python main.py analysis --store <store>` (transforms raw data to canonical format)
- **Full history analysis**: `python main.py analysis --history --store <store>`
- **Run tests**: `pytest` (requires `pip install -r requirements.dev.txt`)
- **Debug mode**: Add `--debug` flag to any command

### Frontend (Web Interface)
Navigate to `web/` directory:
- **Development**: `npm run dev` (runs on port 3000, automatically fetches data)
- **Production**: `npm run start`  
- **Format code**: `npm run format` (Prettier)

### Dependencies
- **Python deps**: `pip install -r requirements.txt`
- **Dev deps**: `pip install -r requirements.dev.txt` 
- **Frontend deps**: `cd web && npm install`

## Architecture

### Backend Structure
- `main.py`: CLI entry point with subcommands for sync and analysis
- `hotprices_au/sites/`: Store-specific scraping modules (`coles.py`, `woolies.py`)
- `hotprices_au/analysis.py`: Data transformation and canonicalization
- `hotprices_au/output.py`: File output handling
- `hotprices_au/categories.py`: Category mapping logic
- `hotprices_au/units.py`: Unit normalization
- `tests/`: pytest-based test suite

### Data Flow
1. **Scraping**: Raw JSON data fetched from store APIs → `output/` directory
2. **Analysis**: Raw data transformed to canonical format → `static/data/` for web interface
3. **Frontend**: Serves static files from `static/data/` with live price history

### Store Integration
New stores are added by:
1. Creating a module in `hotprices_au/sites/`
2. Implementing required functions: `main()`, `get_canonical()`, `get_category_from_map()`
3. Adding to `sites` dict in `hotprices_au/sites/__init__.py`
4. Adding category mapping JSON file in `hotprices_au/data/`

### Frontend Architecture
The web interface is largely static and based on the original heissepreise design:
- `web/site/`: Main application files
- `web/site/model/`: Data models and business logic
- `web/site/views/`: UI components
- Static assets served from root after compilation

### Error Handling
- Scraping allows up to 5% error rate before failing (`ERROR_RATE_MAX = 0.05`)
- Failed item parsing is logged but doesn't stop the process
- Docker retry logic implemented for resilient scraping

## Development Notes

### Testing
- Test files mirror source structure in `tests/`
- Store-specific tests in `tests/stores/`
- Run individual test files: `pytest tests/test_analysis.py`

### Data Storage
- Raw scraped data: `output/<store>/` directory
- Processed data for web: `static/data/` directory
- Category mappings: `hotprices_au/data/<store>-categories.json`

### Docker Support
- `Dockerfile` available for containerized deployment
- Includes AWS CLI v2 for cloud storage integration