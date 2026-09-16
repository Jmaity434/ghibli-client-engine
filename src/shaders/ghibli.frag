#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_videoTexture;
uniform sampler2D u_ghibliTexture; // Hand-painted paper grain texture asset
uniform vec2 u_resolution;
uniform float u_edgeIntensity;

void main() {
    vec2 onePixel = vec2(1.0) / u_resolution;
    
    // 1. Bilateral Smoothing
    vec4 centerColor = texture(u_videoTexture, v_texCoord);
    vec3 colorAcc = vec3(0.0);
    float weightAcc = 0.0;
    
    for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * onePixel;
            vec4 sampleCol = texture(u_videoTexture, v_texCoord + offset);
            
            float dist = length(offset * u_resolution);
            float colorDist = distance(centerColor.rgb, sampleCol.rgb);
            float weight = exp(-0.5 * (dist * dist / 4.0 + colorDist * colorDist / 0.04));
            
            colorAcc += sampleCol.rgb * weight;
            weightAcc += weight;
        }
    }
    
    vec3 smoothedColor = colorAcc / weightAcc;
    
    // Cell-shading quantization — 4 flat levels for true Ghibli flat-color look
    smoothedColor = floor(smoothedColor * 4.0) / 4.0;

    // 2. Sobel Edge Extraction (thin main borders only)
    float tLeft  = texture(u_videoTexture, v_texCoord + vec2(-onePixel.x,  onePixel.y)).r;
    float tTop   = texture(u_videoTexture, v_texCoord + vec2(0.0,         onePixel.y)).r;
    float tRight = texture(u_videoTexture, v_texCoord + vec2(onePixel.x,  onePixel.y)).r;
    float left   = texture(u_videoTexture, v_texCoord + vec2(-onePixel.x, 0.0)).r;
    float right  = texture(u_videoTexture, v_texCoord + vec2(onePixel.x,  0.0)).r;
    float bLeft  = texture(u_videoTexture, v_texCoord + vec2(-onePixel.x, -onePixel.y)).r;
    float bTop   = texture(u_videoTexture, v_texCoord + vec2(0.0,        -onePixel.y)).r;
    float bRight = texture(u_videoTexture, v_texCoord + vec2(onePixel.x, -onePixel.y)).r;

    float gx = (tLeft + (2.0 * left) + bLeft) - (tRight + (2.0 * right) + bRight);
    float gy = (tLeft + (2.0 * tTop) + tRight) - (bLeft + (2.0 * bTop) + bRight);
    float edge = sqrt(gx * gx + gy * gy);

    // Soft threshold so only strong object borders get ink (avoids thick / noisy lines)
    float inkMask = smoothstep(u_edgeIntensity * 0.6, u_edgeIntensity * 1.4, edge);

    // 3. Paper grain — Multiply blend (preserves luminosity, adds vintage paper feel)
    vec3 grainColor = texture(u_ghibliTexture, v_texCoord * 2.5).rgb;
    // Normalize grain toward mid-gray so it doesn’t crush the image
    grainColor = mix(vec3(0.85), grainColor, 0.55);
    vec3 mixedColor = smoothedColor * grainColor;

    // 4. Warm nostalgic / golden-hour tint (boost R+G, slight blue reduction)
    mixedColor.r = min(mixedColor.r * 1.08, 1.0);
    mixedColor.g = min(mixedColor.g * 1.04, 1.0);
    mixedColor.b = mixedColor.b * 0.92;

    // Soft sepia / dark-chocolate ink outline (#2B1E16 ≈ vec3(0.169, 0.118, 0.086))
    vec3 inkColor = vec3(0.169, 0.118, 0.086);
    mixedColor = mix(mixedColor, inkColor, inkMask * 0.82);

    outColor = vec4(clamp(mixedColor, 0.0, 1.0), 1.0);
}
