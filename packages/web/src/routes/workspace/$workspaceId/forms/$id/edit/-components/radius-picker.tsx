import { RADII, RadiusName } from '@shopfunnel/core/form/theme'
import { Picker } from './picker'

const RADIUS_TITLES: Record<RadiusName, string> = {
  none: 'None',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

const radii = RADII.map((radius) => ({
  ...radius,
  title: RADIUS_TITLES[radius.name],
}))

export function RadiusPicker({
  selectedRadiusName,
  onRadiusChange,
}: {
  selectedRadiusName: RadiusName
  onRadiusChange: (radiusName: RadiusName) => void
}) {
  const selectedRadius = radii.find((radius) => radius.name === selectedRadiusName)
  return (
    <Picker.Root>
      <Picker.Trigger>
        <div className="flex flex-col justify-start text-left">
          <div className="text-xs text-muted-foreground">Radius</div>
          <div className="text-xs font-medium text-foreground">{selectedRadius?.title}</div>
        </div>
        <div className="absolute top-1/2 right-4 flex size-4 -translate-y-1/2 rotate-90 items-center justify-center text-base text-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className="text-foreground"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 20v-5C4 8.925 8.925 4 15 4h5"
            />
          </svg>
        </div>
      </Picker.Trigger>
      <Picker.Content side="right" align="start">
        <Picker.RadioGroup
          value={selectedRadiusName}
          onValueChange={(value) => {
            onRadiusChange(value as RadiusName)
          }}
        >
          <Picker.Group>
            {radii.map((radius) => (
              <Picker.RadioItem key={radius.name} value={radius.name}>
                {radius.title}
              </Picker.RadioItem>
            ))}
          </Picker.Group>
        </Picker.RadioGroup>
      </Picker.Content>
    </Picker.Root>
  )
}
