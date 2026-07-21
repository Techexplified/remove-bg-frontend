import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./shared/styles/base.css";
import "./shared/styles/layout.css";
import "./shared/styles/components.css";
import "./shared/styles/hero.css";
import "./shared/styles/features.css";
import "./shared/styles/modals.css";
import "./shared/styles/processing.css";
import "./shared/styles/toolbox.css";
import "./shared/styles/account.css";
import "./shared/styles/help.css";
import "./shared/styles/legal.css";
import "./shared/styles/feedback.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
