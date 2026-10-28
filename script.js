const display = document.getElementById("display");
const expressionField = document.getElementById("expression");
const buttons = document.querySelectorAll(".btn");

const letterMap = {
  0: "P",
  1: "Q",
  2: "R",
  3: "S",
  4: "T",
  5: "U",
  6: "V",
  7: "W",
  8: "X",
  9: "Y",
};

const letterToNumber = {
  P: "0",
  Q: "1",
  R: "2",
  S: "3",
  T: "4",
  U: "5",
  V: "6",
  W: "7",
  X: "8",
  Y: "9",
};

const HISTORY_KEY = "calculator_history_v1";

let firstValue = "";
let secondValue = "";
let operator = null;
let isCodeMode = true;

function formatNumber(value) {
  if (value === "" || value === null || value === undefined) return "0";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "Error";

  if (
    Math.abs(numericValue) >= 1e9 ||
    (Math.abs(numericValue) > 0 && Math.abs(numericValue) < 1e-6)
  ) {
    return numericValue.toExponential(6).replace(/\.0+e/, "e");
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 10,
  }).format(numericValue);
}

function getTypedExpression() {
  if (!firstValue && !secondValue && !operator) return "";
  if (!operator) return firstValue;
  if (!secondValue) return `${firstValue} ${operator}`;
  return `${firstValue} ${operator} ${secondValue}`;
}

function safeEvaluate(expressionText) {
  if (!expressionText) return 0;

  const normalized = expressionText
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .trim();

  if (!normalized) return 0;

  const trimmed = /[+\-*/]$/.test(normalized)
    ? normalized.slice(0, -1)
    : normalized;
  if (!trimmed) return 0;

  try {
    const value = Function(`"use strict"; return (${trimmed});`)();
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(entryText, resultText) {
  const history = readHistory();
  history.push({
    expression: entryText,
    result: resultText,
    timestamp: Date.now(),
  });

  if (history.length > 100) {
    history.splice(0, history.length - 100);
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function renderDigitButtons() {
  document.querySelectorAll("[data-value]").forEach((button) => {
    const value = button.dataset.value;
    button.textContent =
      value === "." ? "." : isCodeMode ? letterMap[value] : value;
  });
}

function updateDisplay() {
  const expressionText = getTypedExpression();
  expressionField.textContent = expressionText || "0";

  if (!expressionText) {
    display.textContent = "0";
    return;
  }

  const resultValue = safeEvaluate(expressionText);
  if (resultValue === null) {
    display.textContent = "Error";
    return;
  }

  display.textContent = formatNumber(String(resultValue));
}

function appendDigit(digit) {
  if (digit === ".") {
    const target = operator === null ? firstValue : secondValue;
    if (target.includes(".")) return;

    const nextValue = target === "" ? "0." : `${target}.`;
    if (operator === null) {
      firstValue = nextValue;
    } else {
      secondValue = nextValue;
    }
    updateDisplay();
    return;
  }

  if (operator === null) {
    firstValue = firstValue === "0" ? digit : firstValue + digit;
  } else {
    secondValue = secondValue === "0" ? digit : secondValue + digit;
  }

  updateDisplay();
}

function setOperator(nextOperator) {
  if (!firstValue) {
    firstValue = "0";
  }

  if (operator && secondValue) {
    const currentText = getTypedExpression();
    const resultValue = safeEvaluate(currentText);
    if (resultValue !== null) {
      firstValue = String(resultValue);
      secondValue = "";
    }
  }

  operator = nextOperator;
  updateDisplay();
}

function clearAll() {
  firstValue = "";
  secondValue = "";
  operator = null;
  expressionField.textContent = "0";
  display.textContent = "0";
}

function backspace() {
  if (operator === null) {
    firstValue = firstValue.slice(0, -1);
    if (firstValue === "") {
      firstValue = "";
    }
  } else {
    secondValue = secondValue.slice(0, -1);
  }

  updateDisplay();
}

function calculate() {
  const expressionText = getTypedExpression();
  if (!expressionText || !operator || !secondValue) return;

  const resultValue = safeEvaluate(expressionText);
  if (resultValue === null) {
    expressionField.textContent = expressionText;
    display.textContent = "Error";
    return;
  }

  const resultText = formatNumber(String(resultValue));
  saveHistory(expressionText, resultText);

  firstValue = String(resultValue);
  secondValue = "";
  operator = null;

  expressionField.textContent = `${firstValue}`;
  display.textContent = resultText;
}

function toggleMode() {
  isCodeMode = !isCodeMode;
  renderDigitButtons();
}

buttons.forEach((button) => {
  const value = button.dataset.value;
  const action = button.dataset.action;

  button.addEventListener("click", () => {
    if (value !== undefined) {
      appendDigit(value);
      return;
    }

    switch (action) {
      case "toggle":
        toggleMode();
        break;
      case "clear":
        clearAll();
        break;
      case "backspace":
        backspace();
        break;
      case "add":
        setOperator("+");
        break;
      case "subtract":
        setOperator("−");
        break;
      case "multiply":
        setOperator("×");
        break;
      case "divide":
        setOperator("÷");
        break;
      case "equals":
        calculate();
        break;
      case "percent":
        if (!firstValue) return;
        const source =
          operator === null ? firstValue : secondValue || firstValue;
        const percentValue = Number(source) / 100;
        if (operator === null) {
          firstValue = String(percentValue);
        } else {
          secondValue = String(percentValue);
        }
        updateDisplay();
        break;
      default:
        break;
    }
  });
});

document.addEventListener("keydown", (event) => {
  const key = event.key;

  if (/^[0-9]$/.test(key)) {
    appendDigit(key);
    return;
  }

  if (key === ".") {
    appendDigit(".");
    return;
  }

  if (key === "+" || key === "-" || key === "*" || key === "/") {
    const mapped =
      key === "+" ? "+" : key === "-" ? "−" : key === "*" ? "×" : "÷";
    setOperator(mapped);
    return;
  }

  if (key === "Enter" || key === "=") {
    calculate();
    return;
  }

  if (key === "Escape") {
    clearAll();
    return;
  }

  if (key === "Backspace") {
    backspace();
    return;
  }

  const letterValue = letterToNumber[key.toUpperCase()];
  if (letterValue !== undefined) {
    appendDigit(letterValue);
  }
});

renderDigitButtons();
clearAll();
updateDisplay();
