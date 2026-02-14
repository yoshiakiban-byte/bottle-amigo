// Image helper module — brand-aligned, minimal icons

/**
 * Get bottle icon based on bottle type
 * Uses simple SVG silhouettes with brand colors
 */
export function getBottleImage(bottleType, size = 64) {
    var type = (bottleType || '');
    var bgColor = '#1a2235';
    var accentColor = '#F2B36B';
    var label = bottleType || 'ボトル';

    if (type.indexOf('焼酎') !== -1) {
        bgColor = '#1a2235';
        accentColor = '#F2B36B';
        label = '焼酎';
    } else if (type.indexOf('ウイスキー') !== -1 || type.indexOf('whisky') !== -1 || type.indexOf('whiskey') !== -1) {
        bgColor = '#231a10';
        accentColor = '#D9983E';
        label = 'ウイスキー';
    } else if (type.indexOf('ワイン') !== -1 || type.indexOf('wine') !== -1) {
        bgColor = '#1f1520';
        accentColor = '#D96C8A';
        label = 'ワイン';
    } else if (type.indexOf('日本酒') !== -1 || type.indexOf('sake') !== -1) {
        bgColor = '#141f1a';
        accentColor = '#9FB5A5';
        label = '日本酒';
    } else if (type.indexOf('ビール') !== -1 || type.indexOf('beer') !== -1) {
        bgColor = '#1f1c10';
        accentColor = '#F2B36B';
        label = 'ビール';
    } else if (type.indexOf('カクテル') !== -1 || type.indexOf('cocktail') !== -1) {
        bgColor = '#1a1525';
        accentColor = '#D96C8A';
        label = 'カクテル';
    } else if (type.indexOf('ブランデー') !== -1 || type.indexOf('brandy') !== -1) {
        bgColor = '#201510';
        accentColor = '#D9983E';
        label = 'ブランデー';
    } else if (type.indexOf('泡盛') !== -1) {
        bgColor = '#101a25';
        accentColor = '#9FB5A5';
        label = '泡盛';
    }

    // SVG bottle silhouette
    var svg = '<svg width="' + Math.round(size * 0.4) + '" height="' + Math.round(size * 0.5) + '" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="9" y="0" width="6" height="6" rx="1" fill="' + accentColor + '" opacity="0.6"/>' +
        '<path d="M9 6 L7 12 L7 27 Q7 29 9 29 L15 29 Q17 29 17 27 L17 12 L15 6 Z" fill="' + accentColor + '" opacity="0.35"/>' +
        '<path d="M9 6 L7 12 L7 27 Q7 29 9 29 L15 29 Q17 29 17 27 L17 12 L15 6 Z" stroke="' + accentColor + '" stroke-width="0.8" fill="none" opacity="0.7"/>' +
    '</svg>';

    return '<div style="' +
        'width:' + size + 'px;' +
        'height:' + size + 'px;' +
        'border-radius:12px;' +
        'background:' + bgColor + ';' +
        'display:flex;' +
        'flex-direction:column;' +
        'align-items:center;' +
        'justify-content:center;' +
        'flex-shrink:0;' +
        'border:1px solid rgba(242,179,107,0.08);' +
    '">' +
        svg +
        (size >= 56 ? '<span style="font-size:8px;color:rgba(255,255,255,0.4);margin-top:3px;letter-spacing:0.05em;">' + label + '</span>' : '') +
    '</div>';
}

/**
 * Get avatar with initials for a user
 * Subtle, muted color palette
 */
export function getAvatarIcon(name, size = 40) {
    var initial = (name || '?').charAt(0);
    var colors = [
        '#9FB5A5', '#D96C8A', '#F2B36B', '#8896A8',
        '#A8917A', '#7A9BA8', '#B5A89F', '#8A7FB5'
    ];
    var hash = 0;
    var n = name || '';
    for (var i = 0; i < n.length; i++) {
        hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    var color = colors[Math.abs(hash) % colors.length];

    return '<div style="' +
        'width:' + size + 'px;' +
        'height:' + size + 'px;' +
        'border-radius:50%;' +
        'background:' + color + ';' +
        'display:flex;' +
        'align-items:center;' +
        'justify-content:center;' +
        'color:white;' +
        'font-weight:500;' +
        'font-size:' + (size * 0.4) + 'px;' +
        'flex-shrink:0;' +
        'letter-spacing:0.02em;' +
        'opacity:0.85;' +
    '">' + initial + '</div>';
}

/**
 * Get store banner image — subtle gradient, no emoji
 */
export function getStoreBanner(storeName) {
    return '<div style="' +
        'width:100%;' +
        'height:140px;' +
        'background:linear-gradient(160deg, #111827 0%, #1a2235 60%, #232d42 100%);' +
        'border-radius:12px;' +
        'display:flex;' +
        'flex-direction:column;' +
        'align-items:center;' +
        'justify-content:center;' +
        'margin-bottom:16px;' +
        'position:relative;' +
        'overflow:hidden;' +
        'border:1px solid rgba(242,179,107,0.08);' +
    '">' +
        '<div style="position:absolute;inset:0;opacity:0.06;background:radial-gradient(circle at 30% 70%, #F2B36B 0%, transparent 50%);"></div>' +
        '<span style="color:#F2B36B;font-size:16px;font-weight:600;position:relative;letter-spacing:0.08em;">' + (storeName || '') + '</span>' +
        '<span style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:6px;position:relative;letter-spacing:0.05em;">Bottle Amigo</span>' +
    '</div>';
}

/**
 * Get store thumbnail for cards
 */
export function getStoreThumbnail(storeName, size) {
    size = size || 48;
    return '<div style="' +
        'width:' + size + 'px;' +
        'height:' + size + 'px;' +
        'border-radius:10px;' +
        'background:linear-gradient(135deg, #111827, #1a2235);' +
        'display:flex;' +
        'align-items:center;' +
        'justify-content:center;' +
        'flex-shrink:0;' +
        'border:1px solid rgba(242,179,107,0.1);' +
    '">' +
        '<svg width="' + Math.round(size * 0.4) + '" height="' + Math.round(size * 0.4) + '" viewBox="0 0 24 24" fill="none" stroke="#F2B36B" stroke-width="1.5" opacity="0.6"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>' +
    '</div>';
}
