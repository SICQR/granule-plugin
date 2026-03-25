#pragma once
#include <vector>

class AllpassFilter
{
public:
    void prepare(int delaySamples, float feedbackGain)
    {
        D = delaySamples > 0 ? delaySamples : 1;
        g = feedbackGain;
        delayLine.assign(D + 1, 0.0f);
        pos = 0;
    }

    float process(float input)
    {
        float delayed = delayLine[pos];
        float output  = -g * input + delayed;
        delayLine[pos] = input + g * delayed;
        pos = (pos + 1) % (int)delayLine.size();
        return output;
    }

    void setGain(float newGain) { g = newGain; }

private:
    std::vector<float> delayLine;
    int   pos = 0;
    int   D   = 1;
    float g   = 0.5f;
};
