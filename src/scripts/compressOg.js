const sharp = require('sharp');

// Generate a 32x32 PNG favicon from the OG image
sharp('public/og-image.png')
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile('src/app/icon.png')
    .then(info => {
        console.log('Favicon created:', info);
    })
    .catch(console.error);

// Also generate a 180x180 apple-touch-icon
sharp('public/og-image.png')
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile('src/app/apple-icon.png')
    .then(info => {
        console.log('Apple icon created:', info);
    })
    .catch(console.error);
