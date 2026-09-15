#version 300 es
in vec2 position;
out vec2 v_texCoord;

void main() {
    v_texCoord = position * 0.5 + 0.5;
    v_texCoord.y = 1.0 - v_texCoord.y; // Flip Y for standard video coordinates
    gl_Position = vec4(position, 0.0, 1.0);
}
