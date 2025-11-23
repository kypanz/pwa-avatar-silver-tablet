
import { Select, SelectAction, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectValue } from 'keep-react'
interface ISelectComponent {
  value: string;
  name: string;
  assistant_id?: string;
}

export const SelectComponent = ({ content, onSelect }: { content: ISelectComponent[], onSelect: any }) => {

  const changeSelected = (v: string) => {
    try {
      onSelect((prev: any) => {
        return { ...prev, assistant_id: v };
      })
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Select onValueChange={(v) => changeSelected(v)}>
      <SelectAction className="w-[20rem]">
        <SelectValue placeholder={'Selecciona el avatar'} />
      </SelectAction>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Avatars </SelectLabel>
          {content && content.map((cont, index) => (
            <SelectItem value={(cont.assistant_id) ? cont.assistant_id : 'no-data'} key={index}>{cont.name}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

