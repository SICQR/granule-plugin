#pragma once
#include <vector>

class CombFilter
{
public:
    void prepare(int delaySamples, float feedbackCoeff)
    {
        D        = delaySamples > 0 ? delaySamples : 1;
        feedback = feedbackCoeff;
        delayLine.assign(D, 0.0f);
        pos = 0;
    }

    float process(float input)
    {
        float output   = delayLine[pos];
        delayLine[pos] = input + output * feedback;
        pos = (pos + 1) % D;
        return output;
    }

    void setFeedback(float f) { feedback = f; }

private:
    std::vector<float> delayLine;
    int   pos      = 0;
    int   D        = 1;
    float feedback = 0.5f;
};
