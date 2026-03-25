#pragma once
#include <JuceHeader.h>
#include "DSP/GrainEngine.h"
#include "DSP/DiffusionNetwork.h"
#include "DSP/EarlyReflections.h"
#include "DSP/LFO.h"

class GranuleAudioProcessor : public juce::AudioProcessor
{
public:
    GranuleAudioProcessor();
    ~GranuleAudioProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    using AudioProcessor::processBlock;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 20.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    juce::AudioProcessorValueTreeState apvts;

    // MIDI learn state
    std::map<int, juce::String> midiMappings;
    bool         midiLearnActive       = false;
    juce::String midiLearnTargetParam;

private:
    // Cached atomic pointers - audio thread safe
    std::atomic<float>* pGrainSize    = nullptr;
    std::atomic<float>* pDensity      = nullptr;
    std::atomic<float>* pPosScatter   = nullptr;
    std::atomic<float>* pPitchScatter = nullptr;
    std::atomic<float>* pShimmer      = nullptr;
    std::atomic<float>* pReverse      = nullptr;
    std::atomic<float>* pFreeze       = nullptr;
    std::atomic<float>* pSize         = nullptr;
    std::atomic<float>* pDiffusion    = nullptr;
    std::atomic<float>* pDecay        = nullptr;
    std::atomic<float>* pPreDelay     = nullptr;
    std::atomic<float>* pErAmount     = nullptr;
    std::atomic<float>* pModRate      = nullptr;
    std::atomic<float>* pModDepth     = nullptr;
    std::atomic<float>* pModTarget    = nullptr;
    std::atomic<float>* pModWave      = nullptr;
    std::atomic<float>* pMix          = nullptr;
    std::atomic<float>* pWidth        = nullptr;
    std::atomic<float>* pOutputGain   = nullptr;

    // DSP objects
    GrainEngine      grainEngine;
    DiffusionNetwork diffusionL, diffusionR;
    EarlyReflections erL, erR;
    LFO              lfo;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(GranuleAudioProcessor)
};
