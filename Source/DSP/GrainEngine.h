#pragma once
#include <JuceHeader.h>
#include "CircularBuffer.h"
#include "GrainVoice.h"
#include <array>
#include <vector>

struct GrainSnapshot
{
    float normPosition = 0.0f;
    float normPitch    = 0.0f;
    float envelope     = 0.0f;
    bool  isShimmer    = false;
};

class GrainEngine
{
public:
    static constexpr int MAX_GRAINS = 256;

    void prepare(double sampleRate, int blockSize);

    void processSample(float inputL, float inputR,
                       float& outWetL, float& outWetR,
                       float grainSizeMs, float density,
                       float posScatter,  float pitchScatter,
                       float shimmer,     bool  freeze,
                       bool  reverse,     double sampleRate);

    void getActiveGrainSnapshots(std::vector<GrainSnapshot>& out) const;

private:
    CircularBuffer inputBuffer;
    std::array<GrainVoice, MAX_GRAINS> grainPool;
    float  schedulerAccum = 0.0f;
    double sr = 44100.0;

    void spawnGrain(float grainSizeMs, float posScatter,
                    float pitchScatter, bool reversed,
                    float shimmerAmount);
    int findFreeVoice();

    static float semitonesToRatio(float semitones)
    {
        return std::pow(2.0f, semitones / 12.0f);
    }
};
