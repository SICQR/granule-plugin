#include "PluginEditor.h"

GranuleAudioProcessorEditor::GranuleAudioProcessorEditor(GranuleAudioProcessor& p)
    : AudioProcessorEditor(&p), audioProcessor(p)
{
    setSize(900, 480);
}

GranuleAudioProcessorEditor::~GranuleAudioProcessorEditor() {}

void GranuleAudioProcessorEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colour(0xff0d0d0f));
    g.setColour(juce::Colour(0xffc9a84c));
    g.setFont(juce::Font("Arial", 24.0f, juce::Font::bold));
    g.drawText("GRANULE", getLocalBounds(), juce::Justification::centred, true);
    g.setFont(juce::Font("Arial", 11.0f, juce::Font::plain));
    g.setColour(juce::Colour(0xff888899));
    g.drawText("INFINITE SPACES FROM FRACTURED MOMENTS",
               getLocalBounds().translated(0, 30), juce::Justification::centred, true);
}

void GranuleAudioProcessorEditor::resized() {}
