#pragma once
#include <JuceHeader.h>
#include <cmath>

class LFO
{
public:
    enum class Waveform { Sine, Triangle, SampleAndHold, SmoothRandom };

    void setWaveform(int index)
    {
        waveform = static_cast<Waveform>(juce::jlimit(0, 3, index));
    }

    float process(float rateHz, double sampleRate)
    {
        if (sampleRate <= 0.0) return 0.0f;
        phase += rateHz / (float)sampleRate;
        if (phase >= 1.0f)
        {
            phase -= 1.0f;
            shValue = juce::Random::getSystemRandom().nextFloat() * 2.0f - 1.0f;
        }

        switch (waveform)
        {
            case Waveform::Sine:
                return std::sin(phase * juce::MathConstants<float>::twoPi);

            case Waveform::Triangle:
                return 1.0f - 4.0f * std::abs(phase - 0.5f);

            case Waveform::SampleAndHold:
                return shValue;

            case Waveform::SmoothRandom:
                smoothed += (shValue - smoothed) * 0.01f;
                return smoothed;
        }
        return 0.0f;
    }

private:
    Waveform waveform = Waveform::Sine;
    float phase    = 0.0f;
    float shValue  = 0.0f;
    float smoothed = 0.0f;
};
