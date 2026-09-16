#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_videoTexture;
uniform sampler2D u_ghibliTexture;
uniform vec2 u_resolution;
uniform float u_edgeIntensity;

// Soft luminance for edge detection (less noise than single channel)
float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 onePixel = vec2(1.0) / u_resolution;

    // -------------------------------------------------------
    // 1. Strong bilateral-style smooth (painterly skin / sky)
    //    Larger effective blur, color-preserving
    // -------------------------------------------------------
    vec3 center = texture(u_videoTexture, v_texCoord).rgb;
    vec3 colorAcc = vec3(0.0);
    float weightAcc = 0.0;

    // 7x7 neighborhood for softer Studio-style surfaces
    for (int x = -3; x <= 3; x++) {
        for (int y = -3; y <= 3; y++) {
            vec2 offset = vec2(float(x), float(y)) * onePixel;
            vec3 sampleCol = texture(u_videoTexture, v_texCoord + offset).rgb;

            float dist = length(vec2(float(x), float(y)));
            float colorDist = distance(center, sampleCol);
            // Wider spatial + color tolerance = smoother paint look
            float weight = exp(-0.5 * (dist * dist / 9.0 + colorDist * colorDist / 0.08));

            colorAcc += sampleCol * weight;
            weightAcc += weight;
        }
    }

    vec3 smoothed = colorAcc / max(weightAcc, 0.001);

    // -------------------------------------------------------
    // 2. Soft cell shading (not hard posterize)
    //    6 levels mixed back with smoothed for gentle bands
    // -------------------------------------------------------
    vec3 quantized = floor(smoothed * 6.0 + 0.5) / 6.0;
    // Keep 55% of the soft gradient so faces/sky stay painterly
    vec3 baseColor = mix(smoothed, quantized, 0.45);

    // -------------------------------------------------------
    // 3. Thin, soft ink outlines (luma Sobel)
    //    Only strong silhouettes — matches reference’s light line work
    // -------------------------------------------------------
    float lC  = luma(texture(u_videoTexture, v_texCoord).rgb);
    float lL  = luma(texture(u_videoTexture, v_texCoord + vec2(-onePixel.x, 0.0)).rgb);
    float lR  = luma(texture(u_videoTexture, v_texCoord + vec2( onePixel.x, 0.0)).rgb);
    float lT  = luma(texture(u_videoTexture, v_texCoord + vec2(0.0,  onePixel.y)).rgb);
    float lB  = luma(texture(u_videoTexture, v_texCoord + vec2(0.0, -onePixel.y)).rgb);
    float lTL = luma(texture(u_videoTexture, v_texCoord + vec2(-onePixel.x,  onePixel.y)).rgb);
    float lTR = luma(texture(u_videoTexture, v_texCoord + vec2( onePixel.x,  onePixel.y)).rgb);
    float lBL = luma(texture(u_videoTexture, v_texCoord + vec2(-onePixel.x, -onePixel.y)).rgb);
    float lBR = luma(texture(u_videoTexture, v_texCoord + vec2( onePixel.x, -onePixel.y)).rgb);

    float gx = -lTL - 2.0 * lL - lBL + lTR + 2.0 * lR + lBR;
    float gy = -lTL - 2.0 * lT - lTR + lBL + 2.0 * lB + lBR;
    float edge = sqrt(gx * gx + gy * gy);

    // Higher threshold + soft mask = thin charcoal lines, not thick black
    float edgeStart = u_edgeIntensity * 1.1;
    float edgeEnd   = u_edgeIntensity * 2.4;
    float inkMask = smoothstep(edgeStart, edgeEnd, edge);
    inkMask = inkMask * inkMask; // concentrate on strongest edges only

    // -------------------------------------------------------
    // 4. Subtle paper / paint grain (soft multiply)
    // -------------------------------------------------------
    vec3 grain = texture(u_ghibliTexture, v_texCoord * 3.0).rgb;
    grain = mix(vec3(1.0), grain, 0.22); // very light texture
    vec3 mixed = baseColor * grain;

    // -------------------------------------------------------
    // 5. Golden-hour / nostalgic grade (matches reference sunset)
    //    Lift reds & yellows, soft warm midtones, slightly crush blue
    // -------------------------------------------------------
    // Warm lift
    mixed.r = mixed.r * 1.12 + 0.02;
    mixed.g = mixed.g * 1.06 + 0.015;
    mixed.b = mixed.b * 0.88;

    // Soft contrast curve (preserve face detail)
    mixed = pow(clamp(mixed, 0.0, 1.0), vec3(0.92));

    // Slight overall golden wash
    vec3 goldWash = vec3(1.0, 0.92, 0.75);
    mixed = mix(mixed, mixed * goldWash, 0.18);

    // -------------------------------------------------------
    // 6. Apply soft sepia ink (never pure black)
    // -------------------------------------------------------
    vec3 inkColor = vec3(0.22, 0.14, 0.10); // warm charcoal
    mixed = mix(mixed, inkColor, inkMask * 0.55);

    // Soft vignette (optional atmosphere, very light)
    vec2 uv = v_texCoord - 0.5;
    float vig = 1.0 - dot(uv, uv) * 0.35;
    mixed *= vig;

    outColor = vec4(clamp(mixed, 0.0, 1.0), 1.0);
}
