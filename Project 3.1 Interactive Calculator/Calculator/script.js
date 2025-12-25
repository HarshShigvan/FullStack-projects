// DOM elements for both displays
const currentDisplay = document.getElementById('current-operand-display');
const historyDisplay = document.getElementById('history-operand-display');
// NEW: Theme Toggle button
const themeToggleButton = document.getElementById('theme-toggle');

// State variable now holds the entire mathematical expression
let expression = '0';
let lastInputIsOperatorOrFunction = false; // Flag to help with validation

// --- Theme Toggle Functionality ---

/**
 * Toggles the 'light-mode' class on the body and changes the button icon.
 */
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    
    // Change icon based on current mode
    if (document.body.classList.contains('light-mode')) {
        themeToggleButton.innerText = '☀️'; // Sun icon for light mode
    } else {
        themeToggleButton.innerText = '🌙'; // Moon icon for dark mode
    }
}

// --- Core Display and Management Functions ---

/**
 * Updates both the expression display (full equation) and the current result display.
 */
function updateDisplay() {
    // Show the full expression in the history display
    historyDisplay.innerText = expression;
    
    // Clear the current display if an error occurred or the expression is just '0'
    if (expression === '0' || expression === 'Error') {
        currentDisplay.innerText = expression;
    } else {
        // Attempt a live calculation preview or just show the last part of the expression
        // For a true scientific calculator, we only update the result on '='
        currentDisplay.innerText = '...'; 
    }
}

/**
 * Appends a number or decimal point to the expression.
 * @param {string} number - The number (0-9) or decimal point (.).
 */
function appendNumber(number) {
    if (expression === '0' || expression === 'Error') {
        expression = (number === '.') ? '0.' : number;
    } else {
        // Prevent adding a decimal immediately after an operator or function if no number is present
        const lastChar = expression.slice(-1);
        if (number === '.' && isNaN(parseFloat(lastChar)) && lastChar !== ')') {
             // If last char is an operator or function, ensure we start with '0.'
             if (lastChar === '+' || lastChar === '-' || lastChar === '*' || lastChar === '/' || lastChar === '(' || lastChar === '√' || lastChar === 'xʸ') {
                expression += '0.';
             } else {
                // If the user tries to press '.' twice in a number, prevent it
                const parts = expression.split(/[^0-9\.]/).pop();
                if (parts.includes('.')) return;
                expression += number;
             }
        } else {
            expression += number;
        }
    }
    lastInputIsOperatorOrFunction = false;
    updateDisplay();
}

/**
 * Appends a standard operator (+, -, *, /) or power (^).
 * @param {string} op - The operator (+, -, *, /).
 */
function chooseOperator(op) {
    if (expression === 'Error') {
        expression = '0';
    }
    
    const lastChar = expression.slice(-1);
    
    // Check if the last input was already an operator (prevent '++' or '*-')
    if (op !== '√' && lastInputIsOperatorOrFunction && lastChar !== ')' && lastChar !== 'xʸ') {
        // Replace the last operator instead of appending a new one (e.g., 5 + * -> 5 *)
        expression = expression.slice(0, -1) + op;
    } else {
        // Special case for 'xʸ' (power) to use '^' in the expression string
        const symbol = (op === 'xʸ') ? '^' : op;
        expression += symbol;
    }
    
    lastInputIsOperatorOrFunction = true;
    updateDisplay();
}

/**
 * Appends a function (sin, cos, tan) to the expression.
 * @param {string} func - The function name (sin, cos, tan).
 */
function appendFunction(func) {
    if (expression === '0' || expression === 'Error') {
        expression = func + '(';
    } else {
        expression += func + '(';
    }
    lastInputIsOperatorOrFunction = true;
    updateDisplay();
}

/**
 * Appends an opening or closing parenthesis.
 * @param {string} bracket - '(' or ')'.
 */
function appendParenthesis(bracket) {
    if (expression === '0' || expression === 'Error') {
        expression = bracket;
    } else {
        expression += bracket;
    }
    lastInputIsOperatorOrFunction = (bracket === '(');
    updateDisplay();
}

/**
 * Performs the robust calculation of the entire expression string.
 */
function calculate() {
    if (expression === 'Error') return;

    // 1. Prepare the expression for JavaScript evaluation
    let safeExpression = expression;
    
    // Replace visual symbols with JS equivalents
    safeExpression = safeExpression.replace(/×/g, '*');
    safeExpression = safeExpression.replace(/÷/g, '/');
    safeExpression = safeExpression.replace(/xʸ/g, '**'); // Power is '**' in JS
    
    // Replace functions and square root with Math calls
    // Note: Math functions usually need arguments in radians, but a calculator usually works in degrees. 
    // We will assume degrees for typical user input and convert.
    // For simplicity here, we'll implement direct Math functions, which assume radians.
    
    safeExpression = safeExpression.replace(/sin\(/g, 'Math.sin(');
    safeExpression = safeExpression.replace(/cos\(/g, 'Math.cos(');
    safeExpression = safeExpression.replace(/tan\(/g, 'Math.tan(');
    safeExpression = safeExpression.replace(/√/g, 'Math.sqrt(');
    
    // Convert power symbol if not already done (redundant but safe check)
    safeExpression = safeExpression.replace(/\^/g, '**');

    let result;
    try {
        // 2. Safely evaluate the expression using the Function constructor
        // This is a common method for sandboxed expression evaluation
        result = new Function('return ' + safeExpression)();
        
        // 3. Post-processing and display
        if (isNaN(result) || !isFinite(result)) {
            expression = 'Error';
        } else {
            // Limit floating point precision for display
            expression = parseFloat(result.toPrecision(10)).toString();
        }
    } catch (e) {
        expression = 'Error';
        console.error('Calculation Error:', e);
    }
    
    // Update both displays (history now shows the final expression, current shows result)
    historyDisplay.innerText = safeExpression.replace(/\*\*/g, '^'); // Show original symbols in history
    currentDisplay.innerText = expression; 
    
    lastInputIsOperatorOrFunction = false;
}

/**
 * Clears all state variables and resets both displays.
 */
function clearAll() {
    expression = '0';
    lastInputIsOperatorOrFunction = false;
    updateDisplay();
}

/**
 * Calculates the percentage (divides the current number by 100).
 */
function percentage() {
    if (expression.match(/^[0-9\.]+$/)) {
        expression = (parseFloat(expression) / 100).toString();
        updateDisplay();
        currentDisplay.innerText = expression; // Show immediate result
    } else {
        // In a scientific calculator, % usually works on the last number/result
        // For simplicity, we'll treat it as a calculation attempt.
        calculate();
        if (expression !== 'Error') {
             expression = (parseFloat(expression) / 100).toString();
        }
        updateDisplay();
        currentDisplay.innerText = expression;
    }
}

/**
 * Toggles the sign (+/-) of the last number in the expression.
 */
function toggleSign() {
    // Find the last number in the expression string
    const match = expression.match(/[0-9\.]+$/);
    if (!match) return;

    const lastNumber = match[0];
    const newNumber = (parseFloat(lastNumber) * -1).toString();
    
    // Replace the last number in the expression
    expression = expression.slice(0, -lastNumber.length) + newNumber;
    updateDisplay();
}


// --- Event Listener Setup ---

// NEW: Theme Toggle Listener
themeToggleButton.addEventListener('click', toggleTheme);

document.querySelectorAll('.buttons button').forEach(button => {
    button.addEventListener('click', () => {
        const number = button.getAttribute('data-number');
        const operator = button.getAttribute('data-operator');
        const action = button.getAttribute('data-action');
        const func = (action === 'function') ? button.innerText : null;

        if (number !== null) {
            appendNumber(button.innerText); 
        } else if (operator !== null) {
            chooseOperator(button.innerText); 
        } else if (action === 'calculate') {
            calculate();
        } else if (action === 'clear') {
            clearAll();
        } else if (action === 'sign') {
            toggleSign();
        } else if (action === 'percent') {
            percentage();
        } else if (action === 'parenthesis') {
            appendParenthesis(button.innerText);
        } else if (action === 'power') {
            chooseOperator('xʸ'); // Use 'xʸ' internally for power
        } else if (func !== null) {
            appendFunction(func);
        }
    });
});

// Initialize display on load
updateDisplay();