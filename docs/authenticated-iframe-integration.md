# Authenticated Iframe Integration Guide

This guide explains how to embed the Ava AI chatbot with authentication pass-through from your parent website.

## Overview

The authenticated iframe embedding allows you to:
- Pass user session data from your website to the Ava chatbot
- Eliminate the need for users to log in again within the chatbot
- Provide seamless access to personalized project information
- Maintain security while offering a smooth user experience

## Quick Start

### 1. Include the Script

Add the authenticated embed script to your website:

```html
<script src="https://ava-ai-chatbot.vercel.app/embed/ava-auth-embed.js"></script>
```

### 2. Set Session Data

When a user logs into your website, pass their session data to the Ava widget:

```javascript
window.AvaAuth.setSession({
  email: 'user@example.com',        // Required: User's email
  userId: 'user123',                // Optional: Your internal user ID
  name: 'John Doe',                 // Optional: User's display name
  token: 'your-auth-token',         // Optional: Your authentication token
  customData: {                     // Optional: Any additional data
    role: 'customer',
    plan: 'premium',
    accountId: 'acc_123'
  }
});
```

### 3. Widget Appears

The floating Ava button will appear in the bottom-right corner. When clicked, the chatbot will be pre-authenticated with the user's session data.

## API Reference

### window.AvaAuth Methods

#### setSession(sessionData)
Sets the session data for the authenticated user.

**Parameters:**
- `sessionData` (object): Session information
  - `email` (string, required): User's email address
  - `userId` (string, optional): Your internal user ID
  - `name` (string, optional): User's display name
  - `token` (string, optional): Authentication token
  - `customData` (object, optional): Additional custom data

**Example:**
```javascript
window.AvaAuth.setSession({
  email: 'customer@example.com',
  userId: 'cust_456',
  name: 'Jane Smith',
  token: 'jwt_token_here',
  customData: { 
    accountType: 'residential',
    projectId: 'proj_789'
  }
});
```

#### clearSession()
Clears the current session data.

```javascript
window.AvaAuth.clearSession();
```

#### getSession()
Returns the current session data.

```javascript
const currentSession = window.AvaAuth.getSession();
console.log(currentSession);
```

#### open()
Programmatically opens the chat widget.

```javascript
window.AvaAuth.open();
```

#### close()
Programmatically closes the chat widget.

```javascript
window.AvaAuth.close();
```

#### isOpen()
Returns whether the widget is currently open.

```javascript
if (window.AvaAuth.isOpen()) {
  console.log('Widget is open');
}
```

## Integration Patterns

### Pattern 1: Set Session on Login

```javascript
// When user logs into your website
function onUserLogin(userData) {
  // Your login logic here...
  
  // Pass session to Ava
  window.AvaAuth.setSession({
    email: userData.email,
    userId: userData.id,
    name: userData.fullName,
    token: userData.authToken
  });
}
```

### Pattern 2: Clear Session on Logout

```javascript
// When user logs out of your website
function onUserLogout() {
  // Your logout logic here...
  
  // Clear Ava session
  window.AvaAuth.clearSession();
}
```

### Pattern 3: Dynamic Session Updates

```javascript
// Update session when user data changes
function onUserDataUpdate(newUserData) {
  window.AvaAuth.setSession({
    email: newUserData.email,
    userId: newUserData.id,
    name: newUserData.fullName,
    token: newUserData.authToken,
    customData: {
      plan: newUserData.subscriptionPlan,
      lastLogin: newUserData.lastLoginDate
    }
  });
}
```

## Security Considerations

### Data Privacy
- Only pass necessary user information
- Avoid including sensitive data in `customData`
- The session data is passed via URL parameters to the iframe

### Token Security
- If passing authentication tokens, ensure they have appropriate expiration times
- Consider using short-lived tokens specifically for the chatbot integration
- Tokens are used for API authentication within the Ava system

### HTTPS Required
- The authenticated iframe only works over HTTPS
- Ensure your website uses SSL/TLS encryption

## Styling and Customization

### Widget Position
The widget appears as a floating button in the bottom-right corner by default. The position is fixed and cannot be customized to maintain consistency.

### Widget Size
- Button: 60px × 60px circular button
- Chat window: 350px × 500px
- Responsive design adapts to mobile screens

### Z-Index
The widget uses `z-index: 10000` to appear above most website content.

## Troubleshooting

### Widget Not Loading
1. Check that the script is loaded correctly
2. Verify HTTPS is being used
3. Check browser console for errors

### Session Not Working
1. Ensure `email` field is provided in session data
2. Check that session is set before opening the widget
3. Verify the email exists in the Aveyo system

### Authentication Issues
1. Check that the token is valid and not expired
2. Verify the user has appropriate permissions
3. Check browser console for authentication errors

## Example Implementation

Here's a complete example of integrating the authenticated iframe:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Solar Portal</title>
</head>
<body>
    <h1>Welcome to My Solar Portal</h1>
    
    <!-- Your website content -->
    <div id="user-dashboard">
        <p>Welcome back, <span id="user-name"></span>!</p>
        <button onclick="openAvaChat()">Chat with Ava</button>
        <button onclick="logout()">Logout</button>
    </div>

    <!-- Include Ava authenticated embed -->
    <script src="https://ava-ai-chatbot.vercel.app/embed/ava-auth-embed.js"></script>
    
    <script>
        // Simulate user login
        const currentUser = {
            email: 'john.doe@example.com',
            id: 'user_123',
            name: 'John Doe',
            authToken: 'jwt_token_here'
        };

        // Set user name in UI
        document.getElementById('user-name').textContent = currentUser.name;

        // Set Ava session
        window.AvaAuth.setSession({
            email: currentUser.email,
            userId: currentUser.id,
            name: currentUser.name,
            token: currentUser.authToken,
            customData: {
                loginTime: new Date().toISOString(),
                userType: 'premium'
            }
        });

        function openAvaChat() {
            window.AvaAuth.open();
        }

        function logout() {
            // Clear Ava session
            window.AvaAuth.clearSession();
            
            // Your logout logic here
            alert('Logged out successfully');
        }
    </script>
</body>
</html>
```

## Demo

You can see a live demo of the authenticated iframe integration at:
https://ava-ai-chatbot.vercel.app/auth-iframe-demo

## Support

For technical support or questions about the authenticated iframe integration, contact:
- Email: customercare@aveyo.com
- Phone: (385) 469-3838
