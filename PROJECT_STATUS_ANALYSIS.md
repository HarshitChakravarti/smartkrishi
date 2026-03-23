# Project Status Analysis

Date: 2026-03-19

## Executive Summary

This project is in the **functional prototype / pre-MVP** stage.

The frontend is real and reasonably complete for a demo: routing, multilingual UI, a multi-step crop input flow, live weather prefill, and a results screen all exist. The ML layer is also real: there is a trainable crop recommendation model, saved metrics, a reusable inference module, and a Flask API wrapper.

However, the project is **not yet end-to-end production-ready**. The biggest blocker is that the checked-in model artifact is incompatible with the current Python/scikit-learn runtime, which means recommendation inference currently fails at runtime. On top of that, the disease detection feature is still a mock/demo, and there is no automated test coverage.

## Main Idea We Are Working On

The core product idea is:

> Help farmers choose the best crop and receive practical field guidance by combining soil/weather inputs, an ML crop recommendation model, and simple advisory logic in a multilingual mobile-friendly interface.

In implementation terms, the current product direction is:

- Use measured agro-climatic inputs (`N`, `P`, `K`, `temperature`, `humidity`, `ph`, `rainfall`) to predict likely crops.
- Re-rank those crop probabilities using farm context (`farm_size`, `previous_crop`, `season`).
- Present the output as simple guidance cards for irrigation, fertilizer, pests, and weather.
- Add a leaf disease workflow as a second feature area.

## What Is Already Built

### Frontend

- React + Vite app with routes for home, crop input, results, and disease pages.
- Multi-step crop input flow in `src/pages/InputForm.jsx`.
- Weather integration with geolocation + Open-Meteo fallback in `src/hooks/useWeather.js`.
- Multilingual support with `i18next` and 5 locales in `src/i18n/`.
- Results screen that requests backend recommendations and converts them into farmer-facing advisory cards in `src/pages/Results.jsx` and `src/lib/advisory.js`.

### ML / Backend

- Training pipeline in `ml/train_crop_model.py`.
- Inference and personalization layer in `ml/recommend_crop.py`.
- Flask API in `ml/api_server.py`.
- Trained artifacts already committed in `models/`.
- Strong saved offline metrics in `models/crop_model_metrics.json`:
  - Accuracy: `0.9932`
  - Macro F1: `0.9932`
  - Samples: `2200`
  - Classes: `22`

### Build Status

- Frontend production build passes with `npm run build`.

## Current Stage

The best description of the current stage is:

**Stage 1 complete:** core concept proven in code.

**Stage 2 partially complete:** UI and ML layers are built, but integration and product hardening are incomplete.

**Stage 3 not started in a serious way:** testing, deployment readiness, observability, and real feature completion are still missing.

If this were mapped to a product lifecycle, this is closer to a **demoable prototype** than a stable MVP.

## What Is Blocking MVP Readiness

### 1. Backend recommendation flow is currently broken at runtime

The biggest issue is the model artifact/runtime mismatch.

Evidence:

- `ml/requirements.txt` installs `scikit-learn>=1.5.0` for Python 3.9+.
- The checked-in model was produced with an older sklearn version, and running inference currently crashes with an attribute error on the deserialized tree estimator.
- `ml/recommend_crop.py` only guards one compatibility failure mode (`ModuleNotFoundError`) but not broader sklearn artifact incompatibilities.

Impact:

- The app can build.
- The recommendation feature cannot be trusted to run end-to-end without rebuilding the model in the current environment.

This is the single most important issue in the repository right now.

### 2. Disease detection is still a mock feature

`src/pages/DiseaseDetection.jsx` does not call a real model or API. It chooses a random entry from `MOCK_RESULTS` after a timeout.

That means the disease feature is currently a demo UI, not an implemented product capability.

### 3. Disease page contains a wiring bug

The mock results are shaped as:

- `diseaseKey`
- `treatmentKeys`

But the render path uses `result.disease` instead of `result.diseaseKey`.

Impact:

- Even the mock result title will not render correctly.

### 4. Home "Farming Guidance" flow is not self-contained

The home page sends the user directly to `/results`, but the results page requires saved crop input from local storage and redirects to `/predict` if it is missing.

Impact:

- The home CTA is misleading.
- The user journey is not coherent unless a recommendation has already been generated.

### 5. Input schema and advisory logic are only partially aligned

The form collects `moisture`, but `src/lib/cropApi.js` does not send it to the API and the ML feature list in `ml/recommend_crop.py` does not use it.

Impact:

- The user is being asked for data that does not affect prediction.
- This weakens trust in the product.

### 6. Advisory content is partly hardcoded and not localized

The app uses `t(...)` on several plain English advisory strings created in `src/lib/advisory.js`. Since those are not real translation keys, they will fall back to raw English text.

Impact:

- English-only advisory output even when the rest of the UI is localized.
- Translation system is only partially completed.

### 7. There is no automated testing

There are no frontend tests, backend tests, API contract tests, or even a smoke test script. `package.json` also has no `test` script.

Impact:

- Regressions will be caught manually, if at all.
- Integration problems like the model/runtime mismatch are easier to miss until late.

## Detailed Assessment By Area

### Product / UX

Status: **partially implemented**

Strengths:

- The app flow is simple and understandable.
- Mobile-first UI choices are visible.
- Language switching is already built.

Gaps:

- Results access depends on local storage state.
- Disease detection is not real.
- Some advice is generic rather than crop-specific.
- There is no onboarding, no explanation of confidence, and no trust/safety messaging.

### Frontend Engineering

Status: **good prototype quality**

Strengths:

- Clean component split.
- Routing is straightforward.
- Build passes.
- Weather hook is isolated cleanly.

Gaps:

- No tests.
- Some state is routed through `localStorage` only.
- Some strings are hardcoded instead of consistently translated.
- Minor product bugs remain.

### ML / Recommendation Logic

Status: **concept proven, not operationally hardened**

Strengths:

- Training pipeline exists.
- Metrics are strong on the saved dataset.
- Personalized re-ranking is implemented and readable.
- Validation exists for numeric payload bounds.

Gaps:

- Runtime compatibility for saved models is not robust.
- No model versioning policy.
- No reproducibility guarantees beyond the script.
- No evaluation beyond the bundled dataset.
- No monitoring or confidence calibration.

### Backend API

Status: **basic but reasonable**

Strengths:

- Clean `/health` and `/api/recommend` endpoints.
- Input validation for malformed requests.
- Environment variable support for model path and port.

Gaps:

- No tests.
- No structured logging.
- No artifact compatibility check beyond loading.
- No deployment configuration.

## What Is Left To Do

### Critical work left

- Rebuild the model artifact in the current environment and make inference run successfully.
- Add a reliable compatibility strategy for model artifacts and sklearn versions.
- Fix the disease page result key bug.
- Decide whether disease detection is in scope now; if yes, replace the mock with a real model/API.
- Fix the home-to-results user flow so it does not depend on hidden local storage state.

### Important work left

- Align form inputs with actual model inputs.
- Move advisory text into real translation keys for all supported languages.
- Add basic automated tests:
  - frontend smoke/build verification
  - backend unit tests for payload validation and personalization
  - API smoke test for `/health` and `/api/recommend`
- Add clearer error states around recommendation failures.

### Later work

- Deployment setup.
- Analytics / usage logging.
- Persistent storage if user history matters.
- Real-world agronomy validation beyond the Kaggle dataset.
- Better explainability for why a crop was recommended.

## Recommended Next Steps

### Immediate next step

1. Make the recommendation path actually run end-to-end.

That means:

- retrain the model with the current installed Python ML stack
- verify `python3 ml/recommend_crop.py --input-file ml/sample_input.json`
- verify `/health`
- verify the frontend results page against the live API

Until this is done, the main feature is not actually usable.

### Next after that

2. Fix obvious product bugs.

- fix `diseaseKey` rendering on the disease page
- fix the home advisory CTA/user flow
- remove unused inputs or make them meaningful

### Then

3. Decide the near-term product scope.

There are really two features in the repo:

- crop recommendation + advisory
- disease detection

The crop feature is much further along. The most pragmatic path is to make that one solid first and treat disease detection as a later milestone unless it is strategically mandatory.

### Then

4. Add minimum testing and release discipline.

- one backend smoke test
- one frontend render/integration smoke test
- pinned training/runtime expectations
- a short release checklist

## Recommended Project Positioning Right Now

If you were describing this project today, the honest statement would be:

> SmartKrishi is a multilingual AI farming assistant prototype with a working frontend, a trained crop recommendation pipeline, and a backend API design in place, but it still needs runtime stabilization, real end-to-end verification, and completion of the disease feature before it can be called MVP-ready.

## Final Judgment

Current stage: **late prototype / early MVP preparation**

Confidence in core direction: **high**

Confidence in current runtime readiness: **low until model artifact is rebuilt and verified**

Best near-term focus:

1. Stabilize crop recommendation end-to-end.
2. Fix product flow bugs.
3. Add basic tests.
4. Either implement or defer disease detection explicitly.

## Analysis Basis

This assessment was based on:

- code inspection across frontend, ML, and API files
- saved model metrics review
- successful frontend production build
- failed live inference run caused by model/runtime incompatibility
