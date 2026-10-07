import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { AnalyticsChoices } from "./AnalyticsChoices.jsx";
import { startAnalytics, wireAnalyticsEvents } from "./analytics.js";
import "./styles.css";

wireAnalyticsEvents();
startAnalytics();
const root = document.getElementById("root");
const app = (
  <React.StrictMode>
    <App />
    <AnalyticsChoices />
  </React.StrictMode>
);
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
