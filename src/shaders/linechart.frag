/*
 * This file is part of KQuickCharts
 * SPDX-FileCopyrightText: 2019 Arjen Hiemstra <ahiemstra@heimr.nl>
 * SPDX-FileCopyrightText: 2022 Łukasz Wojniłowicz <lukasz.wojnilowicz@gmail.com>
 *
 * SPDX-License-Identifier: LGPL-2.1-only OR LGPL-3.0-only OR LicenseRef-KDE-Accepted-LGPL
 */

// This requires "sdf.frag" which is included through SDFShader.

uniform lowp float opacity; // inherited opacity of this item
uniform lowp float lineWidth;
uniform lowp float smoothing;

#define MAXIMUM_POINT_COUNT 18

#ifdef LEGACY_STAGE_INOUT
varying mediump vec2 uv;
varying mediump vec4 pointTuples[MAXIMUM_POINT_COUNT / 2];
varying highp float pointCount;
varying mediump vec2 bounds;
varying mediump vec4 lineColor;
varying mediump vec4 fillColor;
#define out_color gl_FragColor
#else
in mediump vec2 uv;
in mediump vec4 pointTuples[MAXIMUM_POINT_COUNT / 2];
in highp float pointCount;
in mediump vec2 bounds;
in mediump vec4 lineColor;
in mediump vec4 fillColor;
out lowp vec4 out_color;
#endif

// ES2 does not support array function arguments. So instead we need to
// reference the uniform array directly. So this copies the implementation of
// sdf_polygon from sdf.glsl, changing it to refer to the points array directly.
// For simplicity, we use the same function also for other APIs.
lowp float sdf_polygon(in lowp vec2 point, in int count)
{
    mediump vec2 points[MAXIMUM_POINT_COUNT];
    points[0] = pointTuples[0].xy;
    points[1] = pointTuples[0].zw;
    points[2] = pointTuples[1].xy;
    points[3] = pointTuples[1].zw;
    points[4] = pointTuples[2].xy;
    points[5] = pointTuples[2].zw;
    points[6] = pointTuples[3].xy;
    points[7] = pointTuples[3].zw;
    points[8] = pointTuples[4].xy;
    points[9] = pointTuples[4].zw;
    points[10] = pointTuples[5].xy;
    points[11] = pointTuples[5].zw;
    points[12] = pointTuples[6].xy;
    points[13] = pointTuples[6].zw;
    points[14] = pointTuples[7].xy;
    points[15] = pointTuples[7].zw;
    points[16] = pointTuples[8].xy;
    points[17] = pointTuples[8].zw;

    lowp float d = dot(point - points[0], point - points[0]);
    lowp float s = 1.0;
    for (int i = 0, j = count - 1; i < count && i < MAXIMUM_POINT_COUNT; j = i, i++)
    {
        lowp vec2 e = points[j] - points[i];
        lowp vec2 w = point - points[i];
        lowp float h = clamp( dot(w, e) / dot(e, e), 0.0, 1.0 );
        lowp vec2 b = w - e * h;
        d = min(d, dot(b, b));

        bvec3 c = bvec3(point.y >= points[i].y, point.y < points[j].y, e.x * w.y > e.y * w.x);
        if(all(c) || all(not(c))) s *= -1.0;
    }
    return s * sqrt(d);
}

void main()
{
    lowp vec2 point = uv;

    lowp vec4 color = vec4(0.0, 0.0, 0.0, 0.0);

    lowp float bounds_range = max(0.01, lineWidth);

    // bounds.y contains the line segment's maximum value. If we are a bit above
    // that, we will never render anything, so just discard the pixel.
    if (point.y > bounds.y + bounds_range) {
        discard;
    }

    // bounds.x contains the line segment's minimum value. If we are a bit below
    // that, we know we will always be inside the polygon described by points.
    // So just return a pixel with fillColor.
    if (point.y < bounds.x - bounds_range) {
        out_color = fillColor * opacity;
        return;
    }

    lowp float polygon = sdf_polygon(point, int(pointCount));

    color = sdf_render(polygon, color, fillColor);

    if (lineWidth > 0.0) {
        color = mix(color, lineColor, 1.0 - smoothstep(-smoothing, smoothing, sdf_annular(polygon, lineWidth)));
    }

    out_color = color * opacity;
}
