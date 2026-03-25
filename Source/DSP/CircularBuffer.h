#pragma once
#include <JuceHeader.h>

class CircularBuffer
{
public:
    void prepare(int numChannels, int numSamples)
    {
        buffer.setSize(numChannels, numSamples);
        buffer.clear();
        writePos = 0;
        size     = numSamples;
    }

    void writeSample(int channel, float sample)
    {
        if (size > 0)
            buffer.setSample(channel, writePos, sample);
    }

    void advanceWritePointer()
    {
        if (size > 0)
            writePos = (writePos + 1) % size;
    }

    float readSample(int channel, float offsetSamples) const
    {
        if (size <= 0) return 0.0f;
        float readPosF = (float)writePos - offsetSamples;
        while (readPosF < 0) readPosF += (float)size;
        int i0 = (int)readPosF % size;
        int i1 = (i0 + 1) % size;
        float f = readPosF - (float)(int)readPosF;
        return buffer.getSample(channel, i0) * (1.0f - f)
             + buffer.getSample(channel, i1) * f;
    }

    int getSize()     const { return size; }
    int getWritePos() const { return writePos; }

private:
    juce::AudioBuffer<float> buffer;
    int writePos = 0;
    int size     = 0;
};
