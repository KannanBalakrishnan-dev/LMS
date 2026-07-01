# Certificate Font Configuration Guide

This guide explains how to configure font styles for certificates in the Learning Management System with real-time preview functionality.

## Overview

The certificate generation system now supports **50+ configurable fonts** for different text elements on certificates:
- **Student Name**: The name displayed on the certificate
- **Course Name**: The course title displayed on the certificate  
- **Certificate UUID**: The unique identifier displayed on the certificate

## 🎨 Real-Time Font Preview

The certificate template upload page now features **real-time font preview**:
- Font names in dropdown menus are displayed using their actual font styles
- Preview text on the certificate template updates instantly when you change fonts
- Color-coded preview: Red for name, Green for course, Blue for UUID
- Enhanced visibility with background overlay and text shadow

## 📝 Available Font Options

### Standard PDF Fonts (Guaranteed to Work)
These fonts are built into PDF generation and will always render correctly:

#### Helvetica Family (Sans-serif)
- `Helvetica` - Clean, modern sans-serif
- `Helvetica-Bold` - Bold weight
- `Helvetica-Oblique` - Italic style
- `Helvetica-BoldOblique` - Bold italic

#### Times Family (Serif)
- `Times-Roman` - Classic serif font
- `Times-Bold` - Bold weight
- `Times-Italic` - Italic style
- `Times-BoldItalic` - Bold italic

#### Courier Family (Monospace)
- `Courier` - Fixed-width monospace
- `Courier-Bold` - Bold weight
- `Courier-Oblique` - Italic style
- `Courier-BoldOblique` - Bold italic

#### Symbol Fonts
- `Symbol` - Mathematical and scientific symbols
- `ZapfDingbats` - Decorative symbols and icons

### Extended Font Options
Additional fonts that may be available depending on the system:

#### Arial Family
- `Arial` - Popular sans-serif alternative
- `Arial-Bold`, `Arial-Italic`, `Arial-BoldItalic`

#### Georgia Family (Serif)
- `Georgia` - Elegant serif font
- `Georgia-Bold`, `Georgia-Italic`, `Georgia-BoldItalic`

#### Monaco Family (Monospace)
- `Monaco` - Clean monospace font
- `Monaco-Bold`, `Monaco-Italic`, `Monaco-BoldItalic`

#### Verdana Family (Sans-serif)
- `Verdana` - Highly readable sans-serif
- `Verdana-Bold`, `Verdana-Italic`, `Verdana-BoldItalic`

#### Palatino Family (Serif)
- `Palatino` - Classic serif with good readability
- `Palatino-Bold`, `Palatino-Italic`, `Palatino-BoldItalic`

#### Bookman Family (Serif)
- `Bookman` - Traditional book serif
- `Bookman-Bold`, `Bookman-Italic`, `Bookman-BoldItalic`

#### AvantGarde Family (Sans-serif)
- `AvantGarde` - Modern geometric sans-serif
- `AvantGarde-Bold`, `AvantGarde-Italic`, `AvantGarde-BoldItalic`

#### NewCenturySchlbk Family (Serif)
- `NewCenturySchlbk` - Academic serif font
- `NewCenturySchlbk-Bold`, `NewCenturySchlbk-Italic`, `NewCenturySchlbk-BoldItalic`

## 📏 Font Size Options

Available font sizes range from **8 to 80 points**:
- Small text: 8, 9, 10, 11, 12
- Body text: 14, 16, 18, 20, 22
- Headings: 24, 26, 28, 30, 32
- Large text: 34, 36, 38, 40, 42
- Display text: 44, 46, 48, 50, 52, 54, 56, 58, 60
- Extra large: 64, 68, 72, 76, 80

## 🎯 Recommended Font Combinations

### Professional Certificates
- **Name**: `Times-Bold` (28pt) - Elegant and formal
- **Course**: `Times-Roman` (16pt) - Readable serif
- **UUID**: `Helvetica` (10pt) - Clean and small

### Modern Certificates
- **Name**: `Helvetica-Bold` (32pt) - Clean and bold
- **Course**: `Helvetica` (18pt) - Consistent sans-serif
- **UUID**: `Courier` (10pt) - Monospace for technical look

### Academic Certificates
- **Name**: `Georgia-Bold` (30pt) - Scholarly appearance
- **Course**: `Georgia` (16pt) - Elegant serif
- **UUID**: `Times-Roman` (10pt) - Traditional small text

### Creative Certificates
- **Name**: `Palatino-Bold` (28pt) - Artistic serif
- **Course**: `Palatino` (14pt) - Harmonious design
- **UUID**: `Helvetica` (10pt) - Clean contrast

## 🔧 How to Configure Fonts

### Step 1: Access Certificate Template Upload
1. Log in as an admin user
2. Navigate to **Admin Panel** → **Certificate Template Upload**

### Step 2: Upload Template
1. Select a PDF certificate template
2. The preview will appear with default font settings

### Step 3: Configure Font Settings
1. **Font Selection**: Choose from the dropdown menus
   - Font names are displayed in their actual styles
   - Red text for name fonts, Green for course, Blue for UUID

2. **Font Size**: Select appropriate sizes from the dropdown
   - Larger sizes (28-40pt) for names
   - Medium sizes (14-20pt) for course titles
   - Small sizes (8-12pt) for UUIDs

3. **Position Adjustment**: Fine-tune text placement using X/Y coordinates

### Step 4: Real-Time Preview
- Watch the preview update instantly as you change fonts
- Text appears with background overlay for better visibility
- Colors help distinguish between different text elements

### Step 5: Save Configuration
1. Click **Upload** to save the template with font settings
2. The configuration will be used for all future certificates

## 🎨 Font Style Guidelines

### Font Weight
- **Bold fonts** (`-Bold` suffix): Use for emphasis and headings
- **Regular fonts**: Use for body text and secondary information

### Font Style
- **Italic fonts** (`-Italic` suffix): Use sparingly for emphasis
- **Oblique fonts** (`-Oblique` suffix): Similar to italic, more geometric

### Font Family Selection
- **Serif fonts** (Times, Georgia, Palatino): Traditional, formal appearance
- **Sans-serif fonts** (Helvetica, Arial, Verdana): Modern, clean appearance
- **Monospace fonts** (Courier, Monaco): Technical, structured appearance

## ⚠️ Important Notes

### Font Availability
- Standard PDF fonts (Helvetica, Times, Courier) are guaranteed to work
- Extended fonts may fall back to system defaults if not available
- Always test certificate generation with your chosen fonts

### Font Size Considerations
- Very small fonts (< 10pt) may be hard to read
- Very large fonts (> 60pt) may not fit in designated areas
- Consider the template design when selecting sizes

### Performance
- Real-time preview updates may be slightly slower with many font options
- The system optimizes font loading for better performance

## 🔄 Troubleshooting

### Font Not Displaying Correctly
1. Check if the font name is spelled correctly
2. Try using a standard PDF font (Helvetica, Times, Courier)
3. Verify the font size is appropriate for the text area

### Preview Not Updating
1. Refresh the page and try again
2. Check browser console for any JavaScript errors
3. Ensure you're using a modern browser

### Certificate Generation Issues
1. Verify font names match exactly (case-sensitive)
2. Check that font sizes are within reasonable ranges
3. Test with standard fonts first before using extended options

## 📚 Additional Resources

- [PDF Font Standards](https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf)
- [Typography Best Practices](https://www.smashingmagazine.com/2011/03/how-to-choose-a-font/)
- [Certificate Design Guidelines](https://www.canva.com/learn/certificate-design/)

---

**Last Updated**: January 2025
**Version**: 2.0 (Enhanced with Real-time Preview) 