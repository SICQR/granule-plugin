#pragma once
#include <JuceHeader.h>
#include "PluginProcessor.h"

class GranuleAudioProcessorEditor : public juce::AudioProcessorEditor
{
public:
    explicit GranuleAudioProcessorEditor(GranuleAudioProcessor&);
    ~GranuleAudioProcessorEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    GranuleAudioProcessor& audioProcessor;
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(GranuleAudioProcessorEditor)
};
