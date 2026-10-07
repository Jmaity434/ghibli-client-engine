#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_videoTexture;
uniform sampler2D u_ghibliTexture;
uniform vec2 u_resolution;
uniform float u_edgeIntensity;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_fitMode; // 0.0 = fill, 1.0 = contain, 2.0 = cover

// Soft luminance for edge detection
float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = (v_texCoord - u_uvOffset) / u_uvScale;

    // Contain letterboxing
    if (u_fitMode > 0.5 && u_fitMode < 1.5) {
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            outColor = vec4(0.04, 0.035, 0.03, 1.0);
            return;
        }
    }

    vec2 onePixel = vec2(1.0) / max(u_resolution, vec2(1.0));
    vec3 center = texture(u_videoTexture, uv).rgb;

    // -------------------------------------------------------
    // 1. Optimized adaptive bilateral smooth (Studio painterly surfaces)
    //    Balanced 13-tap cross & diagonal kernel for high 60fps performance
    // -------------------------------------------------------
    vec3 colorAcc = center;
    float weightAcc = 1.0;

    const vec2 offsets[12] = vec2[](
        vec2( 0.0,  1.5), vec2( 0.0, -1.5), vec2( 1.5,  0.0), vec2(-1.5,  0.0),
        vec2( 1.2,  1.2), vec2(-1.2,  1.2), vec2( 1.2, -1.2), vec2(-1.2, -1.2),
        vec2( 0.0,  2.8), vec2( 0.0, -2.8), vec2( 2.8,  0.0), vec2(-2.8,  0.0)
    );

    for (int i = 0; i < 12; i++) {
        vec2 sampleUv = clamp(uv + offsets[i] * onePixel, 0.0, 1.0);
        vec3 col = texture(u_videoTexture, sampleUv).rgb;
        float dColor = distance(center, col);
        float w = exp(-dColor * dColor / 0.06);
        colorAcc += col * w;
        weightAcc += w;
    }

    vec3 smoothed = colorAcc / weightAcc;

    // -------------------------------------------------------
    // 2. Soft cel shading (gentle 6-level tonal grouping)
    // -------------------------------------------------------
    vec3 quantized = floor(smoothed * 6.0 + 0.5) / 6.0;
    vec3 baseColor = mix(smoothed, quantized, 0.42);

    // -------------------------------------------------------
    // 3. Thin, warm ink outlines (Sobel on luminance)
    // -------------------------------------------------------
    float lC  = luma(center);
    float lL  = luma(texture(u_videoTexture, clamp(uv + vec2(-onePixel.x, 0.0), 0.0, 1.0)).rgb);
    float lR  = luma(texture(u_videoTexture, clamp(uv + vec2( onePixel.x, 0.0), 0.0, 1.0)).rgb);
    float lT  = luma(texture(u_videoTexture, clamp(uv + vec2(0.0,  onePixel.y), 0.0, 1.0)).rgb);
    float lB  = luma(texture(u_videoTexture, clamp(uv + vec2(0.0, -onePixel.y), 0.0, 1.0)).rgb);
    float lTL = luma(texture(u_videoTexture, clamp(uv + vec2(-onePixel.x,  onePixel.y), 0.0, 1.0)).rgb);
    float lTR = luma(texture(u_videoTexture, clamp(uv + vec2( onePixel.x,  onePixel.y), 0.0, 1.0)).rgb);
    float lBL = luma(texture(u_videoTexture, clamp(uv + vec2(-onePixel.x, -onePixel.y), 0.0, 1.0)).rgb);
    float lBR = luma(texture(u_videoTexture, clamp(uv + vec2( onePixel.x, -onePixel.y), 0.0, 1.0)).rgb);

    float gx = -lTL - 2.0 * lL - lBL + lTR + 2.0 * lR + lBR;
    float gy = -lTL - 2.0 * lT - lTR + lBL + 2.0 * lB + lBR;
    float edge = sqrt(gx * gx + gy * gy);

    float edgeStart = u_edgeIntensity * 1.1;
    float edgeEnd   = u_edgeIntensity * 2.3;
    float inkMask = smoothstep(edgeStart, edgeEnd, edge);
    inkMask = inkMask * inkMask;

    // -------------------------------------------------------
    // 4. Watercolor / paper grain multiply
    // -------------------------------------------------------
    vec3 grain = texture(u_ghibliTexture, uv * 3.5).rgb;
    grain = mix(vec3(1.0), grain, 0.24);
    vec3 mixed = baseColor * grain;

    // -------------------------------------------------------
    // 5. Golden-hour / nostalgic anime grade
    // -------------------------------------------------------
    mixed.r = mixed.r * 1.12 + 0.02;
    mixed.g = mixed.g * 1.06 + 0.015;
    mixed.b = mixed.b * 0.88;

    mixed = pow(clamp(mixed, 0.0, 1.0), vec3(0.92));

    vec3 goldWash = vec3(1.0, 0.93, 0.76);
    mixed = mix(mixed, mixed * goldWash, 0.16);

    // Warm charcoal ink outlines
    vec3 inkColor = vec3(0.20, 0.13, 0.09);
    mixed = mix(mixed, inkColor, inkMask * 0.55);

    // Soft atmosphere vignette
    vec2 vuv = v_texCoord - 0.5;
    float vig = 1.0 - dot(vuv, vuv) * 0.32;
    mixed *= vig;

    outColor = vec4(clamp(mixed, 0.0, 1.0), 1.0);
}
