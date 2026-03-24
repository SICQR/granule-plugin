#include "PluginProcessor.h"
#include "PluginEditor.h"

GranuleAudioProcessor::GranuleAudioProcessor()
    : AudioProcessor(BusesProperties()
        .withInput("Input",   juce::AudioChannelSet::stereo(), true)
        .withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "GRANULE_PARAMS", createParameterLayout())
{
    pGrainSize    = apvts.getRawParameterValue("grain_size");
    pDensity      = apvts.getRawParameterValue("density");
    pPosScatter   = apvts.getRawParameterValue("pos_scatter");
    pPitchScatter = apvts.getRawParameterValue("pitch_scatter");
    pShimmer      = apvts.getRawParameterValue("shimmer");
    pReverse      = apvts.getRawParameterValue("reverse");
    pFreeze       = apvts.getRawParameterValue("freeze");
    pSize         = apvts.getRawParameterValue("size");
    pDiffusion    = apvts.getRawParameterValue("diffusion");
    pDecay        = apvts.getRawParameterValue("decay");
    pPreDelay     = apvts.getRawParameterValue("pre_delay");
    pErAmount     = apvts.getRawParameterValue("er_amount");
    pModRate      = apvts.getRawParameterValue("mod_rate");
    pModDepth     = apvts.getRawParameterValue("mod_depth");
    pModTarget    = apvts.getRawParameterValue("mod_target");
    pModWave      = apvts.getRawParameterValue("mod_wave");
    pMix          = apvts.getRawParameterValue("mix");
    pWidth        = apvts.getRawParameterValue("width");
    pOutputGain   = apvts.getRawParameterValue("output_gain");
}

GranuleAudioProcessor::~GranuleAudioProcessor() {}

juce::AudioProcessorValueTreeState::ParameterLayout
GranuleAudioProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"grain_size", 1}, "Grain Size",
        juce::NormalisableRange<float>(20.0f, 500.0f, 0.1f, 0.5f), 80.0f,
        juce::AudioParameterFloatAttributes().withLabel("ms")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"density", 1}, "Density",
        juce::NormalisableRange<float>(1.0f, 200.0f, 0.1f, 0.5f), 40.0f,
        juce::AudioParameterFloatAttributes().withLabel("g/s")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"pos_scatter", 1}, "Position Scatter",
        juce::NormalisableRange<float>(0.0f, 100.0f), 30.0f,
        juce::AudioParameterFloatAttributes().withLabel("%")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"pitch_scatter", 1}, "Pitch Scatter",
        juce::NormalisableRange<float>(0.0f, 24.0f, 0.01f), 0.0f,
        juce::AudioParameterFloatAttributes().withLabel("st")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"shimmer", 1}, "Shimmer",
        juce::NormalisableRange<float>(0.0f, 100.0f), 0.0f,
        juce::AudioParameterFloatAttributes().withLabel("%")));

    params.push_back(std::make_unique<juce::AudioParameterBool>(
        juce::ParameterID{"reverse", 1}, "Reverse", false));

    params.push_back(std::make_unique<juce::AudioParameterBool>(
        juce::ParameterID{"freeze", 1}, "Freeze", false));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"size", 1}, "Size",
        juce::NormalisableRange<float>(0.0f, 100.0f), 50.0f,
        juce::AudioParameterFloatAttributes().withLabel("%")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"diffusion", 1}, "Diffusion",
        juce::NormalisableRange<float>(0.0f, 100.0f), 60.0f,
        juce::AudioParameterFloatAttributes().withLabel("%")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"decay", 1}, "Decay",
        juce::NormalisableRange<float>(0.1f, 20.0f, 0.01f, 0.4f), 4.0f,
        juce::AudioParameterFloatAttributes().withLabel("s")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"pre_delay", 1}, "Pre-Delay",
        juce::NormalisableRange<float>(0.0f, 200.0f, 0.1f), 10.0f,
        juce::AudioParameterFloatAttributes().withLabel("ms")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"er_amount", 1}, "Early Reflections",
        juce::NormalisableRange<float>(0.0f, 100.0f), 40.0f,
        juce::AudioParameterFloatAttributes().withLabel("%")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"mod_rate", 1}, "Mod Rate",
        juce::NormalisableRange<float>(0.01f, 10.0f, 0.001f, 0.4f), 0.5f,
        juce::AudioParameterFloatAttributes().withLabel("Hz")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"mod_depth", 1}, "Mod Depth",
        juce::NormalisableRange<float>(0.0f, 100.0f), 0.0f,
        juce::AudioParameterFloatAttributes().withLabel("%")));

    params.push_back(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID{"mod_target", 1}, "Mod Target",
        juce::StringArray{"pos_scatter","pitch_scatter","shimmer","size"}, 0));

    params.push_back(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID{"mod_wave", 1}, "Mod Waveform",
        juce::StringArray{"Sine","Triangle","S&H","Smooth Random"}, 0));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"mix", 1}, "Mix",
        juce::NormalisableRange<float>(0.0f, 100.0f), 50.0f,
        juce::AudioParameterFloatAttributes().withLabel("%")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"width", 1}, "Width",
        juce::NormalisableRange<float>(0.0f, 200.0f), 100.0f,
        juce::AudioParameterFloatAttributes().withLabel("%")));

    params.push_back(std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID{"output_gain", 1}, "Output Gain",
        juce::NormalisableRange<float>(-24.0f, 6.0f, 0.1f), 0.0f,
        juce::AudioParameterFloatAttributes().withLabel("dB")));

    return { params.begin(), params.end() };
}

void GranuleAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock)
{
    grainEngine.prepare(sampleRate, samplesPerBlock);
    diffusionL.prepare(sampleRate, 0.5f, 0.6f);
    diffusionR.prepare(sampleRate, 0.5f, 0.6f);
    erL.prepare(sampleRate, 0.5f, 40.0f);
    erR.prepare(sampleRate, 0.5f, 40.0f);
}

void GranuleAudioProcessor::releaseResources() {}

void GranuleAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;

    // Handle MIDI CC learn
    for (const auto meta : midiMessages)
    {
        auto msg = meta.getMessage();
        if (!msg.isController()) continue;
        int   cc  = msg.getControllerNumber();
        float val = msg.getControllerValue() / 127.0f;
        if (midiLearnActive) {
            midiMappings[cc]  = midiLearnTargetParam;
            midiLearnActive   = false;
            continue;
        }
        auto it = midiMappings.find(cc);
        if (it != midiMappings.end()) {
            auto* param = apvts.getParameter(it->second);
            if (param) param->setValueNotifyingHost(val);
        }
    }

    const int numSamples = buffer.getNumSamples();

    const float grainSizeMs  = pGrainSize->load();
    const float density      = pDensity->load();
    const float posScatter   = pPosScatter->load();
    const float pitchScatter = pPitchScatter->load();
    const float shimmer      = pShimmer->load();
    const bool  freeze       = pFreeze->load() > 0.5f;
    const bool  reverse      = pReverse->load() > 0.5f;
    const float diffusion    = pDiffusion->load() / 100.0f;
    const float erAmount     = pErAmount->load();
    const float modRate      = pModRate->load();
    const float modDepth     = pModDepth->load() / 100.0f;
    const int   modTarget    = (int)pModTarget->load();
    const float width        = pWidth->load() / 100.0f;
    const float mix          = pMix->load() / 100.0f;
    const float gainLinear   = juce::Decibels::decibelsToGain(pOutputGain->load());

    lfo.setWaveform((int)pModWave->load());
    diffusionL.setDiffusion(diffusion);
    diffusionR.setDiffusion(diffusion);
    erL.setErAmount(erAmount);
    erR.setErAmount(erAmount);

    for (int i = 0; i < numSamples; ++i)
    {
        float inL = buffer.getSample(0, i);
        float inR = buffer.getNumChannels() > 1 ? buffer.getSample(1, i) : inL;

        // LFO modulation
        float lfoOut = lfo.process(modRate, getSampleRate());
        float effectivePosScatter   = posScatter;
        float effectivePitchScatter = pitchScatter;
        if (modTarget == 0) effectivePosScatter   = juce::jlimit(0.0f, 100.0f, posScatter   + lfoOut * modDepth * 100.0f);
        if (modTarget == 1) effectivePitchScatter = juce::jlimit(0.0f, 24.0f,  pitchScatter + lfoOut * modDepth * 24.0f);

        // Grain engine
        float wetL = 0.0f, wetR = 0.0f;
        grainEngine.processSample(inL, inR, wetL, wetR,
                                  grainSizeMs, density,
                                  effectivePosScatter, effectivePitchScatter,
                                  shimmer, freeze, reverse, getSampleRate());

        // Diffusion + early reflections
        float diffL = diffusionL.process(wetL) + erL.process(wetL);
        float diffR = diffusionR.process(wetR) + erR.process(wetR);

        // Mid-side width
        float mid  = (diffL + diffR) * 0.5f;
        float side = (diffL - diffR) * 0.5f * width;
        float outL = (mid + side) * mix + inL * (1.0f - mix);
        float outR = (mid - side) * mix + inR * (1.0f - mix);

        buffer.setSample(0, i, outL * gainLinear);
        if (buffer.getNumChannels() > 1)
            buffer.setSample(1, i, outR * gainLinear);
    }
}

juce::AudioProcessorEditor* GranuleAudioProcessor::createEditor()
{
    return new GranuleAudioProcessorEditor(*this);
}

void GranuleAudioProcessor::getStateInformation(juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void GranuleAudioProcessor::setStateInformation(const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));
    if (xmlState && xmlState->hasTagName(apvts.state.getType()))
        apvts.replaceState(juce::ValueTree::fromXml(*xmlState));
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new GranuleAudioProcessor();
}
