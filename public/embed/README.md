# Ava Solar Assistant - Website Integration

Easily add Ava, your AI solar assistant, to any website with just one line of code.

## Quick Integration

Add this single line of code to your website, just before the closing `</body>` tag:

```html
<script src="https://your-domain.com/embed/ava-widget.js"></script>
```

That's it! The Ava chat widget will automatically appear on your website.

## Features

- ✅ **Instant Setup** - One line of code integration
- ✅ **Responsive Design** - Works on desktop and mobile
- ✅ **No Dependencies** - Pure JavaScript, no frameworks required
- ✅ **CORS Enabled** - Works on any domain
- ✅ **Customizable** - Easy to modify appearance and behavior

## How It Works

1. **Chat Button**: A floating blue chat button appears in the bottom-right corner
2. **Click to Open**: Users click the button to open the chat widget
3. **AI Responses**: Ava provides intelligent responses about solar installations
4. **Easy to Use**: Clean, intuitive interface that matches modern chat expectations

## Widget Appearance

- **Position**: Fixed bottom-right corner
- **Size**: 350px wide × 500px tall when open
- **Colors**: Blue theme matching Aveyo branding
- **Animation**: Smooth transitions and loading indicators

## Customization Options

### Change Widget Position

Edit the CSS in `ava-widget.js`:

```javascript
// Change from bottom-right to bottom-left
bottom: 20px;
left: 20px;  // instead of right: 20px;
```

### Update API Endpoint

In `ava-widget.js`, update the CONFIG object:

```javascript
const CONFIG = {
  apiUrl: 'https://your-actual-domain.com/api/embed/chat',
  // ... other config
};
```

### Modify Colors

Update the inline styles in the WIDGET_HTML template:

```javascript
// Header background
background: #your-color;

// Button background  
background: #your-color;
```

## Advanced Integration

### Custom Trigger

Instead of the default floating button, you can trigger the widget programmatically:

```html
<!-- Your custom button -->
<button onclick="AvaWidget.open()">Chat with Ava</button>

<!-- Widget script -->
<script src="https://your-domain.com/embed/ava-widget.js"></script>
```

### Event Callbacks

Listen for widget events:

```javascript
// After the widget script loads
window.addEventListener('ava-widget-ready', function() {
  console.log('Ava widget is ready');
});

window.addEventListener('ava-message-sent', function(event) {
  console.log('User sent:', event.detail.message);
});
```

## Domain Configuration

For production, update the CORS settings in `/pages/api/embed/chat.ts`:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-website.com', // Specify your domain
  // ... other headers
};
```

## Testing

1. **Local Testing**: Use the widget on localhost during development
2. **Production**: Deploy and test on your actual domain
3. **Mobile**: Test on mobile devices to ensure responsive behavior

## Support

For technical support or customization requests, contact the Aveyo development team.

## Security

- All conversations are processed securely
- No sensitive data is stored in the widget
- HTTPS required for production use
- CORS properly configured for cross-domain security
