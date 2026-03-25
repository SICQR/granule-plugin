#pragma once
#include "AllpassFilter.h"
#include <array>

class DiffusionNetwork
{
public:
    static constexpr int NUM_STAGES = 8;
    static constexpr float BASE_TIMES_MS[NUM_STAGES] = {13.0f, 19.0f, 29.0f, 41.0f, 59.0f, 71.0f, 83.0f, 101.0f};

    void prepare(double sampleRate, float size, float diffusion)
    {
        sr = sampleRate;
        for (int i = 0; i < NUM_STAGES; ++i)
        {
            float scalar  = 0.5f + size * 1.5f;
            int   samples = (int)(BASE_TIMES_MS[i] * scalar * sampleRate / 1000.0);
            float gain    = diffusion * 0.7f;
            stages[i].prepare(samples, gain);
        }
    }

    void setDiffusion(float diffusion)
    {
        float gain = diffusion * 0.7f;
        for (auto& s : stages) s.setGain(gain);
    }

    float process(float input)
    {
        float x = input;
        for (auto& s : stages) x = s.process(x);
        return x;
    }

private:
    std::array<AllpassFilter, NUM_STAGES> stages;
    double sr = 44100.0;
};
