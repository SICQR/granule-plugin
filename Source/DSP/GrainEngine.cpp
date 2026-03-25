#include "GrainEngine.h"

void GrainEngine::prepare(double sampleRate, int /*blockSize*/)
{
    sr = sampleRate;
    int bufSize = (int)(sampleRate * 4.0);
    inputBuffer.prepare(2, bufSize);
    for (auto& g : grainPool) g.active = false;
    schedulerAccum = 0.0f;
}

void GrainEngine::processSample(float inputL, float inputR,
                                float& outWetL, float& outWetR,
                                float grainSizeMs, float density,
                                float posScatter,  float pitchScatter,
                                float shimmer,     bool  freeze,
                                bool  reverse,     double sampleRate)
{
    inputBuffer.writeSample(0, inputL);
    inputBuffer.writeSample(1, inputR);
    if (!freeze)
        inputBuffer.advanceWritePointer();

    schedulerAccum += density / (float)sampleRate;
    while (schedulerAccum >= 1.0f)
    {
        spawnGrain(grainSizeMs, posScatter, pitchScatter, reverse, shimmer);
        schedulerAccum -= 1.0f;
    }

    float wetL = 0.0f, wetR = 0.0f;

    for (auto& g : grainPool)
    {
        if (!g.active) continue;

        float win  = g.window();
        float smpL = inputBuffer.readSample(0, g.offsetSamples) * win;
        float smpR = inputBuffer.readSample(1, g.offsetSamples) * win;

        wetL += smpL * g.gainL;
        wetR += smpR * g.gainR;

        g.offsetSamples -= g.playbackRate;
        ++g.currentSample;

        if (g.currentSample >= g.lengthSamples)
            g.active = false;
    }

    float norm = 1.0f / std::sqrt(std::max(density, 1.0f) / 20.0f);
    outWetL = wetL * norm;
    outWetR = wetR * norm;
}

void GrainEngine::spawnGrain(float grainSizeMs, float posScatter,
                              float pitchScatter, bool reversed,
                              float shimmerAmount)
{
    auto& rng = juce::Random::getSystemRandom();

    auto spawn = [&](float playbackRate, float gainScale, bool isShimmer)
    {
        int idx = findFreeVoice();
        if (idx < 0) return;

        auto& g = grainPool[idx];
        g.active        = true;
        g.isShimmer     = isShimmer;
        g.lengthSamples = (int)(grainSizeMs / 1000.0f * (float)sr);
        g.currentSample = 0;
        g.playbackRate  = reversed ? -playbackRate : playbackRate;

        float scatterSamples = (posScatter / 100.0f) * (float)sr * 0.5f;
        g.offsetSamples = (float)g.lengthSamples + rng.nextFloat() * scatterSamples;

        float pan  = rng.nextFloat() * 2.0f - 1.0f;
        g.gainL    = (1.0f - pan * 0.5f) * gainScale;
        g.gainR    = (1.0f + pan * 0.5f) * gainScale;
    };

    float pitchRatio = semitonesToRatio((rng.nextFloat() * 2.0f - 1.0f) * pitchScatter);
    spawn(pitchRatio, 1.0f, false);

    if (shimmerAmount > 0.0f)
        spawn(2.0f, shimmerAmount / 100.0f, true);
}

int GrainEngine::findFreeVoice()
{
    for (int i = 0; i < MAX_GRAINS; ++i)
        if (!grainPool[i].active) return i;
    return -1;
}

void GrainEngine::getActiveGrainSnapshots(std::vector<GrainSnapshot>& out) const
{
    out.clear();
    int bufSize = inputBuffer.getSize();
    for (const auto& g : grainPool)
    {
        if (!g.active) continue;
        GrainSnapshot s;
        s.normPosition = bufSize > 0 ? std::fmod(g.offsetSamples / (float)bufSize, 1.0f) : 0.0f;
        s.normPitch    = juce::jmap(g.playbackRate, 0.5f, 2.0f, 0.0f, 1.0f);
        s.envelope     = g.window();
        s.isShimmer    = g.isShimmer;
        out.push_back(s);
    }
}
