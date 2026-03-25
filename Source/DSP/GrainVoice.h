#pragma once
#include <cmath>

struct GrainVoice
{
    bool  active        = false;
    float offsetSamples = 0.0f;
    int   lengthSamples = 0;
    int   currentSample = 0;
    float playbackRate  = 1.0f;
    float gainL         = 0.7f;
    float gainR         = 0.7f;
    bool  isShimmer     = false;

    float progress() const
    {
        return lengthSamples > 0
            ? (float)currentSample / (float)lengthSamples
            : 0.0f;
    }

    float window() const
    {
        constexpr float twoPi = 6.28318530718f;
        float p = progress();
        return 0.5f * (1.0f - std::cos(twoPi * p));
    }
};
