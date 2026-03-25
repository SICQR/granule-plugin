#pragma once
#include "CombFilter.h"
#include <array>

class EarlyReflections
{
public:
    static constexpr float COMB_TIMES_MS[4] = {17.0f, 23.0f, 31.0f, 37.0f};

    void prepare(double sampleRate, float size, float erAmount)
    {
        for (int i = 0; i < 4; ++i)
        {
            float scalar   = 0.5f + size * 0.3f;
            int   samples  = (int)(COMB_TIMES_MS[i] * scalar * sampleRate / 1000.0);
            float fb       = (erAmount / 100.0f) * 0.85f;
            combs[i].prepare(samples, fb);
        }
    }

    void setErAmount(float erAmount)
    {
        float fb = (erAmount / 100.0f) * 0.85f;
        for (auto& c : combs) c.setFeedback(fb);
    }

    float process(float input)
    {
        float sum = 0.0f;
        for (auto& c : combs) sum += c.process(input);
        return sum * 0.25f;
    }

private:
    std::array<CombFilter, 4> combs;
};
