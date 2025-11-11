/**
 * Email Template Engine
 * Renders email templates with variable substitution
 */

/**
 * Replace template variables with actual values
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} variables - Object with variable values
 * @returns {string} - Rendered template
 */
export function renderTemplate(template, variables = {}) {
  if (!template || typeof template !== "string") {
    return template;
  }

  let rendered = template;

  // Replace all {{variable}} with actual values
  Object.keys(variables).forEach((key) => {
    const value = variables[key] !== undefined && variables[key] !== null 
      ? String(variables[key]) 
      : "";
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    rendered = rendered.replace(regex, value);
  });

  // Remove any remaining {{variable}} that weren't replaced
  rendered = rendered.replace(/\{\{[\w]+\}\}/g, "");

  return rendered;
}

/**
 * Validate required variables are present
 * @param {Array} requiredVars - Array of required variable names
 * @param {Object} variables - Object with variable values
 * @returns {Object} - { valid: boolean, missing: string[] }
 */
export function validateVariables(requiredVars = [], variables = {}) {
  const missing = requiredVars.filter(
    (varName) => !variables.hasOwnProperty(varName) || variables[varName] === undefined
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get default email template HTML structure
 * @param {Object} options - Template options
 * @returns {string} - HTML template structure
 */
export function getDefaultEmailStructure(options = {}) {
  const {
    headerColor = "#667eea",
    headerGradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    title = "",
    content = "",
    buttonText = "",
    buttonUrl = "",
    footerText = "Best regards,<br>The Catholic Trading Post Team",
  } = options;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f4f4f4;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: ${headerGradient}; 
          color: white; 
          padding: 30px 20px; 
          border-radius: 8px 8px 0 0; 
          text-align: center;
        }
        .header h2 { 
          margin: 0; 
          font-size: 24px; 
        }
        .content { 
          background: #ffffff; 
          padding: 30px 20px; 
          border-radius: 0 0 8px 8px; 
        }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background-color: ${headerColor}; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0; 
          font-weight: bold;
        }
        .footer { 
          margin-top: 30px; 
          font-size: 12px; 
          color: #666; 
          text-align: center; 
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .info-box {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
          border-left: 4px solid ${headerColor};
        }
        .success-box {
          background: #d4edda;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
          border-left: 4px solid #28a745;
        }
        .warning-box {
          background: #fff3cd;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
          border-left: 4px solid #ffc107;
        }
        .error-box {
          background: #f8d7da;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
          border-left: 4px solid #dc3545;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${title ? `<div class="header"><h2>${title}</h2></div>` : ""}
        <div class="content">
          ${content}
          ${buttonText && buttonUrl ? `<a href="${buttonUrl}" class="button">${buttonText}</a>` : ""}
          <div class="footer">
            <p>${footerText}</p>
            <p style="font-size: 10px; color: #999; margin-top: 10px;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default {
  renderTemplate,
  validateVariables,
  getDefaultEmailStructure,
};

