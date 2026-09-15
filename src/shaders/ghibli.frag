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
    
    // 1. Bilateral Smoothing / Quantization Filter Simulation
    vec4 centerColor = texture(u_videoTexture, v_texCoord);
    vec3 colorAcc = vec3(0.0);
    float weightAcc = 0.0;
    
    for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * onePixel;
            vec4 sampleCol = texture(u_videoTexture, v_texCoord + offset);
            
            // Spatial & Color Intensity Weighting
            float dist = length(offset * u_resolution);
            float colorDist = distance(centerColor.rgb, sampleCol.rgb);
            float weight = exp(-0.5 * (dist * dist / 4.0 + colorDist * colorDist / 0.04));
            
            colorAcc += sampleCol.rgb * weight;
            weightAcc += weight;
        }
    }
    
    vec3 smoothedColor = colorAcc / weightAcc;
    
    // Quantize Colors to mimic hand-selected palette profiles
    smoothedColor = floor(smoothedColor * 8.0) / 8.0;

    // 2. Sobel Edge Extraction Pipeline
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

    // 3. Multi-layer Blend Configuration
    vec4 ghibliPaper = texture(u_ghibliTexture, v_texCoord * 2.0); // Tiled paper texture
    vec3 mixedColor = mix(smoothedColor, ghibliPaper.rgb, 0.15);
    
    // Apply line art borders
    if (edge > u_edgeIntensity) {
        mixedColor = mix(mixedColor, vec3(0.12, 0.08, 0.08), 0.75); // Dark brown Ghibli ink outline
    }

    outColor = vec4(mixedColor, 1.0);
}
